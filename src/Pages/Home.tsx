import React, {useEffect, useState} from 'react';
import {observer} from "mobx-react";
import __wbg_init, {Group, Identity, Provider} from "../utils/crypto/openmls";
import {useStores} from "../models/helpers/useStores";

export const Home = observer(function Home() {
    const {userStore} = useStores()
    const [isWasmInitialized, setWasmInitialized] = useState(false);

    useEffect(() => {
        const initializeWasm = async () => {
            await __wbg_init();

            const provider = new Provider()
            const identity = Identity.deserialize(userStore.me.serializedIdentity, provider)

            const group = Group.create_new(provider, identity, 'test')

            console.log(group.serialize())

            provider.free()
            identity.free()
            group.free()
        };

        if (!isWasmInitialized) {
            initializeWasm();
            setWasmInitialized(true);
        }

    }, [isWasmInitialized])

    return <></>

})

function compare_bytes(left: Uint8Array, right: Uint8Array) {
    if (left.length !== right.length) {
        return false
    }

    return left.every((value, index) => value === right[index])
}