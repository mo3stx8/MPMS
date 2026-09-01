import os
import subprocess
import re
import time

def run_command(command):
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    return result.stdout.strip(), result.returncode

def get_latest_commit_timestamp(branch, filename, start_line=None, end_line=None):
    """Gets the timestamp of the latest commit touching a file or range in a branch."""
    if start_line and end_line:
        # We use git blame to find the latest timestamp in a specific line range
        cmd = f"git blame -L {start_line},{end_line} -- {filename} -p {branch}"
    else:
        cmd = f"git log -1 --format=%ct {branch} -- {filename}"
    
    stdout, code = run_command(cmd)
    if code != 0:
        # Fallback to general branch log if file-specific log fails
        stdout, _ = run_command(f"git log -1 --format=%ct {branch}")
        return int(stdout) if stdout else 0

    if start_line and end_line:
        # Parse blame output for timestamps
        timestamps = re.findall(r'^author-time (\d+)', stdout, re.MULTILINE)
        return max(map(int, timestamps)) if timestamps else 0
    else:
        return int(stdout) if stdout else 0

def resolve_file_conflicts(filename, branch_name):
    print(f"Resolving conflicts in {filename}...")
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('<<<<<<<'):
            # Start of conflict block
            ours_start = i + 1
            separator = -1
            theirs_end = -1
            
            j = i + 1
            while j < len(lines):
                if lines[j].startswith('======='):
                    separator = j
                elif lines[j].startswith('>>>>>>>'):
                    theirs_end = j
                    break
                j += 1
            
            if separator != -1 and theirs_end != -1:
                ours_content = lines[ours_start:separator]
                theirs_content = lines[separator+1:theirs_end]
                
                # Heuristic: Find latest commit in 'main' that touched this file
                # and latest commit in 'branch' that touched this file.
                # For more precision, we'd need line-by-line blame, but that's complex
                # while a file is in conflict state.
                # So we use the latest commit on EACH side that affected this file.
                
                # We can't easily blame the current mid-merge state.
                # So we look at the branch tips vs main tip relative to this file.
                ours_ts = get_latest_commit_timestamp('HEAD', filename)
                theirs_ts = get_latest_commit_timestamp(branch_name, filename)
                
                print(f"  Conflict at {filename}:{i+1}")
                print(f"    Ours (HEAD) TS: {ours_ts}")
                print(f"    Theirs ({branch_name}) TS: {theirs_ts}")
                
                if theirs_ts > ours_ts:
                    print("    Resolution: Using THEIRS (newer)")
                    new_lines.extend(theirs_content)
                else:
                    print("    Resolution: Using OURS (older or equal)")
                    new_lines.extend(ours_content)
                
                i = theirs_end + 1
                continue
        
        new_lines.append(line)
        i += 1

    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

def main():
    # 1. Get list of branches
    stdout, _ = run_command("git branch -a")
    branches = []
    for line in stdout.split('\n'):
        branch = line.strip().replace('* ', '')
        if 'remotes/origin/' in branch and 'HEAD' not in branch and 'main' not in branch:
            local_name = branch.split('/')[-1]
            branches.append((branch, local_name))
        elif branch and branch != 'main' and not branch.startswith('remotes/'):
            branches.append((branch, branch))

    # Deduplicate by local name
    unique_branches = {}
    for remote, local in branches:
        unique_branches[local] = remote
    
    print(f"Found branches to merge: {list(unique_branches.keys())}")

    for local, remote in unique_branches.items():
        print(f"\nMerging {local} ({remote})...")
        stdout, code = run_command(f"git merge {remote}")
        
        if code != 0:
            print(f"Conflict detected in {local}. Attempting automatic resolution...")
            stdout, _ = run_command("git diff --name-only --diff-filter=U")
            conflicting_files = stdout.split('\n')
            for f in conflicting_files:
                if f:
                    resolve_file_conflicts(f, remote)
            
            # Stage resolved files
            run_command("git add .")
            run_command(f'git commit -m "Merge {local} into main (Automatic conflict resolution preferred newer)"')
            print(f"Successfully merged {local} with resolution.")
        else:
            print(f"Successfully merged {local} (no conflicts).")

if __name__ == "__main__":
    main()
