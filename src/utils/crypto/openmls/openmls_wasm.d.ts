/* tslint:disable */
/* eslint-disable */
/**
*/
export function greet(): void;
/**
* Handler for `console.log` invocations.
*
* If a test is currently running it takes the `args` array and stringifies
* it and appends it to the current output of the test. Otherwise it passes
* the arguments to the original `console.log` function, psased as
* `original`.
* @param {Array<any>} args
*/
export function __wbgtest_console_log(args: Array<any>): void;
/**
* Handler for `console.debug` invocations. See above.
* @param {Array<any>} args
*/
export function __wbgtest_console_debug(args: Array<any>): void;
/**
* Handler for `console.info` invocations. See above.
* @param {Array<any>} args
*/
export function __wbgtest_console_info(args: Array<any>): void;
/**
* Handler for `console.warn` invocations. See above.
* @param {Array<any>} args
*/
export function __wbgtest_console_warn(args: Array<any>): void;
/**
* Handler for `console.error` invocations. See above.
* @param {Array<any>} args
*/
export function __wbgtest_console_error(args: Array<any>): void;
/**
*/
export class AddMessages {
  free(): void;
/**
*/
  readonly commit: Uint8Array;
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
  add_member(provider: Provider, sender: Identity, new_member: KeyPackage): AddMessages;
/**
* @param {Provider} provider
* @param {Identity} sender
* @param {LeafNodeIndex} removed_member
* @returns {RemoveMessages}
*/
  remove_member(provider: Provider, sender: Identity, removed_member: LeafNodeIndex): RemoveMessages;
/**
* @param {Provider} provider
* @param {Identity} sender
* @returns {RemoveMessages}
*/
  update_key_package(provider: Provider, sender: Identity): RemoveMessages;
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
/**
* @param {KeyPackage} member
* @returns {LeafNodeIndex}
*/
  get_member_index(member: KeyPackage): LeafNodeIndex;
/**
* @returns {string}
*/
  serialize(): string;
/**
* @param {string} serialized
* @returns {Group}
*/
  static deserialize(serialized: string): Group;
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
/**
* @returns {string}
*/
  serialize(): string;
/**
* @param {Provider} provider
* @param {string} serialized
* @returns {Identity}
*/
  static deserialize(provider: Provider, serialized: string): Identity;
}
/**
*/
export class KeyPackage {
  free(): void;
/**
* @returns {string}
*/
  serialize(): string;
/**
* @param {string} serialized
* @returns {KeyPackage}
*/
  static deserialize(serialized: string): KeyPackage;
}
/**
*/
export class LeafNodeIndex {
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
* @returns {string}
*/
  serialize(): string;
/**
* @param {string} json_str
* @returns {Provider}
*/
  static deserialize(json_str: string): Provider;
/**
*/
  constructor();
}
/**
*/
export class RatchetTree {
  free(): void;
/**
* @returns {string}
*/
  serialize(): string;
/**
* @param {string} serialized
* @returns {RatchetTree}
*/
  static deserialize(serialized: string): RatchetTree;
}
/**
*/
export class RemoveMessages {
  free(): void;
/**
*/
  readonly commit: Uint8Array;
/**
*/
  readonly welcome: Uint8Array | undefined;
}
/**
* Runtime test harness support instantiated in JS.
*
* The node.js entry script instantiates a `Context` here which is used to
* drive test execution.
*/
export class WasmBindgenTestContext {
  free(): void;
/**
* Creates a new context ready to run tests.
*
* A `Context` is the main structure through which test execution is
* coordinated, and this will collect output and results for all executed
* tests.
*/
  constructor();
/**
* Inform this context about runtime arguments passed to the test
* harness.
* @param {any[]} args
*/
  args(args: any[]): void;
/**
* Executes a list of tests, returning a promise representing their
* eventual completion.
*
* This is the main entry point for executing tests. All the tests passed
* in are the JS `Function` object that was plucked off the
* `WebAssembly.Instance` exports list.
*
* The promise returned resolves to either `true` if all tests passed or
* `false` if at least one test failed.
* @param {any[]} tests
* @returns {Promise<any>}
*/
  run(tests: any[]): Promise<any>;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_leafnodeindex_free: (a: number) => void;
  readonly __wbg_provider_free: (a: number) => void;
  readonly provider_serialize: (a: number, b: number) => void;
  readonly provider_deserialize: (a: number, b: number, c: number) => void;
  readonly provider_new: () => number;
  readonly greet: () => void;
  readonly __wbg_identity_free: (a: number) => void;
  readonly identity_new: (a: number, b: number, c: number, d: number) => void;
  readonly identity_key_package: (a: number, b: number) => number;
  readonly identity_serialize: (a: number, b: number) => void;
  readonly identity_deserialize: (a: number, b: number, c: number, d: number) => void;
  readonly __wbg_group_free: (a: number) => void;
  readonly __wbg_addmessages_free: (a: number) => void;
  readonly __wbg_removemessages_free: (a: number) => void;
  readonly addmessages_commit: (a: number) => number;
  readonly addmessages_welcome: (a: number) => number;
  readonly removemessages_commit: (a: number) => number;
  readonly removemessages_welcome: (a: number) => number;
  readonly group_create_new: (a: number, b: number, c: number, d: number) => number;
  readonly group_join: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly group_export_ratchet_tree: (a: number) => number;
  readonly group_add_member: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly group_remove_member: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly group_update_key_package: (a: number, b: number, c: number, d: number) => void;
  readonly group_merge_pending_commit: (a: number, b: number, c: number) => void;
  readonly group_process_message: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly group_export_key: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
  readonly group_get_member_index: (a: number, b: number, c: number) => void;
  readonly group_serialize: (a: number, b: number) => void;
  readonly group_deserialize: (a: number, b: number, c: number) => void;
  readonly __wbg_nowelcomeerror_free: (a: number) => void;
  readonly __wbg_keypackage_free: (a: number) => void;
  readonly keypackage_serialize: (a: number, b: number) => void;
  readonly keypackage_deserialize: (a: number, b: number, c: number) => void;
  readonly __wbg_ratchettree_free: (a: number) => void;
  readonly ratchettree_serialize: (a: number, b: number) => void;
  readonly ratchettree_deserialize: (a: number, b: number, c: number) => void;
  readonly __wbg_wasmbindgentestcontext_free: (a: number) => void;
  readonly wasmbindgentestcontext_new: () => number;
  readonly wasmbindgentestcontext_args: (a: number, b: number, c: number) => void;
  readonly wasmbindgentestcontext_run: (a: number, b: number, c: number) => number;
  readonly __wbgtest_console_log: (a: number) => void;
  readonly __wbgtest_console_debug: (a: number) => void;
  readonly __wbgtest_console_info: (a: number) => void;
  readonly __wbgtest_console_warn: (a: number) => void;
  readonly __wbgtest_console_error: (a: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h6b9866cc3b2cfae8: (a: number, b: number, c: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly wasm_bindgen__convert__closures__invoke3_mut__h367e4c38e8f2a4ce: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly wasm_bindgen__convert__closures__invoke2_mut__hf798eaf28bc95219: (a: number, b: number, c: number, d: number) => void;
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
