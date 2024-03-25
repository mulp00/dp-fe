/* tslint:disable */
/* eslint-disable */
/**
*/
export function greet(): void;
/**
*/
export class AddMessages {
  free(): void;
/**
*/
  readonly commit: Uint8Array;
/**
*/
  readonly proposal: Uint8Array;
/**
*/
  readonly welcome: Uint8Array;
}
/**
*/
export class Group {
  free(): void;
/**
* @param {Provider} provider
* @param {Identity} founder
* @param {string} group_id
* @returns {Group}
*/
  static create_new(provider: Provider, founder: Identity, group_id: string): Group;
/**
* @param {Provider} provider
* @param {Uint8Array} welcome
* @param {RatchetTree} ratchet_tree
* @returns {Group}
*/
  static join(provider: Provider, welcome: Uint8Array, ratchet_tree: RatchetTree): Group;
/**
* @returns {RatchetTree}
*/
  export_ratchet_tree(): RatchetTree;
/**
* @param {Provider} provider
* @param {Identity} sender
* @param {KeyPackage} new_member
* @returns {AddMessages}
*/
  propose_and_commit_add(provider: Provider, sender: Identity, new_member: KeyPackage): AddMessages;
/**
* @param {Provider} provider
*/
  merge_pending_commit(provider: Provider): void;
/**
* @param {Provider} provider
* @param {Uint8Array} msg
* @returns {Uint8Array}
*/
  process_message(provider: Provider, msg: Uint8Array): Uint8Array;
/**
* @param {Provider} provider
* @param {string} label
* @param {Uint8Array} context
* @param {number} key_length
* @returns {Uint8Array}
*/
  export_key(provider: Provider, label: string, context: Uint8Array, key_length: number): Uint8Array;
}
/**
*/
export class Identity {
  free(): void;
/**
* @param {Provider} provider
* @param {string} name
*/
  constructor(provider: Provider, name: string);
/**
* @param {Provider} provider
* @returns {KeyPackage}
*/
  key_package(provider: Provider): KeyPackage;
}
/**
*/
export class KeyPackage {
  free(): void;
}
/**
*/
export class NoWelcomeError {
  free(): void;
}
/**
*/
export class Provider {
  free(): void;
/**
*/
  constructor();
}
/**
*/
export class RatchetTree {
  free(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_provider_free: (a: number) => void;
  readonly provider_new: () => number;
  readonly greet: () => void;
  readonly __wbg_identity_free: (a: number) => void;
  readonly identity_new: (a: number, b: number, c: number, d: number) => void;
  readonly identity_key_package: (a: number, b: number) => number;
  readonly __wbg_group_free: (a: number) => void;
  readonly __wbg_addmessages_free: (a: number) => void;
  readonly addmessages_proposal: (a: number) => number;
  readonly addmessages_commit: (a: number) => number;
  readonly addmessages_welcome: (a: number) => number;
  readonly group_create_new: (a: number, b: number, c: number, d: number) => number;
  readonly group_join: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly group_export_ratchet_tree: (a: number) => number;
  readonly group_propose_and_commit_add: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly group_merge_pending_commit: (a: number, b: number, c: number) => void;
  readonly group_process_message: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly group_export_key: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
  readonly __wbg_nowelcomeerror_free: (a: number) => void;
  readonly __wbg_keypackage_free: (a: number) => void;
  readonly __wbg_ratchettree_free: (a: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
