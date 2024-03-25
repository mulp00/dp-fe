import React, {useState, useEffect} from 'react';
import __wbg_init, {Group, Identity, Provider, RatchetTree} from "../utils/crypto/openmls";

export default function Mls() {

    const [isWasmInitialized, setWasmInitialized] = useState(false);

    useEffect(() => {
        const initializeWasm = async () => {
            await __wbg_init();

            const alice_provider = new Provider();
            const bob_provider = new Provider();

            const alice = new Identity(alice_provider, "alice");
            const bob = new Identity(bob_provider, "bob");

            const chess_club_alice = Group.create_new(alice_provider, alice, "chess club");
            const bob_key_pkg = bob.key_package(bob_provider);

            console.log("alice: adding and building welcome...");
            const add_msgs = chess_club_alice.propose_and_commit_add(
                alice_provider,
                alice,
                bob_key_pkg
            );

            console.log("alice: committing...");
            chess_club_alice.merge_pending_commit(alice_provider);

            console.log("alice: exporting ratchet tree...");
            const ratchet_tree = chess_club_alice.export_ratchet_tree();

            console.log("bob:   joining...");
            const chess_club_bob = Group.join(
                bob_provider,
                add_msgs.welcome,
                ratchet_tree
            );

            console.log("alice: exporting key...");
            const alice_exported_key = chess_club_alice.export_key(
                alice_provider,
                "chess_key",
                new Uint8Array(32).fill(0x30),
                32
            );
            console.log(alice_exported_key);

            console.log("bob:   exporting key...");
            const bob_exported_key = chess_club_bob.export_key(
                bob_provider,
                "chess_key",
                new Uint8Array(32).fill(0x30),
                32
            );
            console.log(bob_exported_key);

            function compare_bytes(left: Uint8Array, right: Uint8Array) {
                if (left.length !== right.length) {
                    return false
                }

                return left.every((value, index) => value === right[index])
            }

            if (!compare_bytes(alice_exported_key, bob_exported_key)) {
                console.error("expected keys to match, but they dont!")
            } else {
                console.log("success: the keys match!")
            }

            alice_provider.free()
            bob_provider.free()
            alice.free()
            bob.free()
            chess_club_alice.free()
            bob_key_pkg.free()
            add_msgs.free()
            ratchet_tree.free()
            chess_club_bob.free()

        };

        if (!isWasmInitialized) {
            initializeWasm();
            setWasmInitialized(true);
        }

    })
    return <></>

}