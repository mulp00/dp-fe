import React from 'react';
import {useStores} from "../models/helpers/useStores";

export default function Home() {
    const {authStore} = useStores()
    console.log(authStore.authToken)
    return <>Ahoj</>

}
