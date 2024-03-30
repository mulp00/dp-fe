import { useEffect } from 'react';
import {api} from '../services';
import {useStores} from "../models/helpers/useStores"; // Adjust the import path as needed

export default function useApiService() {
    const { authStore } = useStores();

    useEffect(() => {
        if (authStore.authToken) {
            api.setAuthToken(authStore.authToken);
        }
    }, [authStore.authToken]); // Re-run when authToken changes

    return api;
}
