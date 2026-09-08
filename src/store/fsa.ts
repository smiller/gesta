/* The File System Access handles as this app uses them, declared here
   because lib.dom does not yet carry the directory iteration. The suites
   supply fakes shaped to these; the browser supplies the real ones. */
export interface WritableFile {
  write(body: string | Uint8Array): Promise<void>;
  close(): Promise<void>;
}
export interface FileH {
  kind: "file";
  name: string;
  getFile(): Promise<{ size: number; text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> }>;
  createWritable(): Promise<WritableFile>;
}
export interface Dir {
  kind: "directory";
  name: string;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<Dir>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileH>;
  removeEntry(name: string): Promise<void>;
  /* pumped by hand through next(): the fakes answer that protocol without
     being iterable, and the real handle's iterator answers it too */
  values(): AsyncIterator<Dir | FileH>;
  queryPermission(opts: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission(opts: { mode: "read" | "readwrite" }): Promise<PermissionState>;
}
export type Entry = Dir | FileH;
