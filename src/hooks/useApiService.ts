import {useEffect} from 'react';
import {api} from '../services';
import {useStores} from "../models/helpers/useStores"; // Adjust the import path as needed

export default function useApiService() {
    const {authStore, clear} = useStores();

    useEffect(() => {
        if (authStore.authToken) {
            api.setAuthToken(authStore.authToken);
        }

        const handleAuthError = async (error: any) => {
            if (error.response.data.error === 'refresh_token_expired') {
                await api.logout()
                clear()
            }
        };

        api.onAuthError(handleAuthError);

        return () => {
            // Cleanup: Remove the error handler when the component unmounts or the effect re-runs
            api.errorHandlers = api.errorHandlers.filter(handler => handler !== handleAuthError);
        };

    }, [authStore.authToken]); // Re-run when authToken changes

    return api;
}
