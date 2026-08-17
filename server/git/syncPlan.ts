import type { PreparedGitChange } from "./types.js";

function pathSet(changes: PreparedGitChange[]) {
  return new Set(changes.map((change) => change.path));
}

export function compareRemoteScopeChanges(
  remotePaths: string[],
  localChanges: PreparedGitChange[],
  changesAgainstRemote: PreparedGitChange[]
) {
  const localPaths = pathSet(localChanges);
  const againstRemotePaths = pathSet(changesAgainstRemote);

  const conflicts = remotePaths.filter(
    (remotePath) => localPaths.has(remotePath) && againstRemotePaths.has(remotePath)
  );

  const remotePendingLocally = remotePaths.filter(
    (remotePath) => !localPaths.has(remotePath) && againstRemotePaths.has(remotePath)
  );

  return {
    conflicts,
    remotePendingLocally
  };
}
