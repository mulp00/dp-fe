import React, {useState, useEffect} from 'react';
import __wbg_init, {Group, Identity, Provider} from "../utils/crypto/openmls";
import {deserialize} from "node:v8";

export default function Mls() {

    const [isWasmInitialized, setWasmInitialized] = useState(false);

    useEffect(() => {
        const initializeWasm = async () => {
            await __wbg_init();

            const alice_provider = new Provider();
            const bob_provider = new Provider();
            const carol_provider = new Provider()

            const alice = new Identity(alice_provider, "alice");
            const bob = new Identity(bob_provider, "bob");
            const carol = new Identity(carol_provider, "carol");

            const chess_club_alice = Group.create_new(alice_provider, alice, "chess club");

            const alice_key_pkg = alice.key_package(alice_provider);
            const bob_key_pkg = bob.key_package(bob_provider);
            const carol_key_pkg = carol.key_package(carol_provider);

            console.log("alice: adding and building welcome for bob...");
            const add_msgs_bob = chess_club_alice.add_member(
                alice_provider,
                alice,
                bob_key_pkg
            );

            console.log("alice: committing...");
            chess_club_alice.merge_pending_commit(alice_provider);

            console.log("alice: exporting ratchet tree...");
            const ratchet_tree_bob = chess_club_alice.export_ratchet_tree();

            console.log("bob:   joining...");
            const chess_club_bob = Group.join(
                bob_provider,
                add_msgs_bob.welcome,
                ratchet_tree_bob
            );

            console.log("alice: adding and building welcome for carol...");
            const add_msgs_carol = chess_club_alice.add_member(
                alice_provider,
                alice,
                carol_key_pkg
            );

            console.log("alice: committing...");
            chess_club_alice.merge_pending_commit(alice_provider);

            console.log("alice: exporting ratchet tree...");
            const ratchet_tree_carol = chess_club_alice.export_ratchet_tree();

            console.log("bob:   joining...");
            const chess_club_carol = Group.join(
                carol_provider,
                add_msgs_carol.welcome,
                ratchet_tree_carol
            );

            console.log("bob:   exporting key...");
            const bob_exported_key_old = chess_club_bob.export_key(
                bob_provider,
                "chess_key",
                new Uint8Array(32).fill(0x30),
                32
            );
            console.log(bob_exported_key_old);

            console.log("carol:   exporting key...");
            const carol_exported_key_old = chess_club_carol.export_key(
                carol_provider,
                "chess_key",
                new Uint8Array(32).fill(0x30),
                32
            );
            console.log(carol_exported_key_old);
            if (compare_bytes(bob_exported_key_old, carol_exported_key_old)) {
                console.error("expected keys to not match, but they do!")
            } else {
                console.log("success: the keys dont match!")
            }

            chess_club_bob.process_message(bob_provider, add_msgs_carol.commit)


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

            console.log("carol:   exporting key...");
            const carol_exported_key = chess_club_carol.export_key(
                carol_provider,
                "chess_key",
                new Uint8Array(32).fill(0x30),
                32
            );
            console.log(carol_exported_key);


            if (!compare_bytes(alice_exported_key, bob_exported_key)) {
                console.error("expected keys to match, but they dont!")
            } else {
                console.log("success: the keys match!")
            }


            if (!compare_bytes(alice_exported_key, carol_exported_key)) {
                console.error("expected keys to match, but they dont!")
            } else {
                console.log("success: the keys match!")
            }

            let carol_index = chess_club_bob.get_member_index(carol_key_pkg)

            console.log("bob removing carol...");
            const bob_remove_carol_msg = chess_club_bob.remove_member(
                bob_provider,
                bob,
                carol_index
            );
            console.log("bob: committing...");
            chess_club_bob.merge_pending_commit(bob_provider);

            chess_club_alice.process_message(alice_provider, bob_remove_carol_msg.commit)

            console.log("alice: exporting key...");
            const alice_exported_key_new = chess_club_alice.export_key(
                alice_provider,
                "chess_key",
                new Uint8Array(32).fill(0x30),
                32
            );
            console.log(alice_exported_key_new);

            console.log("bob:   exporting key...");
            const bob_exported_key_new = chess_club_bob.export_key(
                bob_provider,
                "chess_key",
                new Uint8Array(32).fill(0x30),
                32
            );
            console.log(bob_exported_key_new);

            console.log("carol:   exporting key...");
            const carol_exported_key_new = chess_club_carol.export_key(
                carol_provider,
                "chess_key",
                new Uint8Array(32).fill(0x30),
                32
            );
            console.log(carol_exported_key_new);


            if (!compare_bytes(bob_exported_key_new, alice_exported_key_new)) {
                console.error("expected keys to match, but they dont!")
            } else {
                console.log("success: the keys match!")
            }


            if (compare_bytes(alice_exported_key_new, carol_exported_key_new)) {
                console.error("expected keys not to match, but they do!")
            } else {
                console.log("success: the keys dont match!")
            }


            console.log("bob updating keys...");
            const bob_update_keys_message = chess_club_bob.update_key_package(
                bob_provider,
                bob,
            );
            console.log("bob: committing...");
            chess_club_bob.merge_pending_commit(bob_provider);

            chess_club_alice.process_message(alice_provider, bob_update_keys_message.commit)

            let serialized_chess_club_alice = chess_club_alice.serialize()
            let deserialized_chess_club_alice = Group.deserialize(serialized_chess_club_alice)

            console.log("alice: exporting key...");
            const alice_exported_key_new2 = deserialized_chess_club_alice.export_key(
                alice_provider,
                "chess_key",
                new Uint8Array(32).fill(0x30),
                32
            );
            console.log(alice_exported_key_new2);

            console.log("bob:   exporting key...");
            const bob_exported_key_new2 = chess_club_bob.export_key(
                bob_provider,
                "chess_key",
                new Uint8Array(32).fill(0x30),
                32
            );
            console.log(bob_exported_key_new2);

            if (!compare_bytes(bob_exported_key_new2, alice_exported_key_new2)) {
                console.error("expected keys to match, but they dont!")
            } else {
                console.log("success: the keys match!")
            }


            alice_provider.free()
            bob_provider.free()
            carol_provider.free()

            alice.free()
            bob.free()
            carol.free()

            bob_key_pkg.free()
            carol_key_pkg.free()

            add_msgs_bob.free()
            add_msgs_carol.free()

            ratchet_tree_bob.free()
            ratchet_tree_carol.free()

            chess_club_alice.free()
            chess_club_bob.free()
            chess_club_carol.free()

        };

        if (!isWasmInitialized) {
            initializeWasm();
            setWasmInitialized(true);
        }

    }, [isWasmInitialized])
    return <></>

}

function compare_bytes(left: Uint8Array, right: Uint8Array) {
    if (left.length !== right.length) {
        return false
    }

    return left.every((value, index) => value === right[index])
}