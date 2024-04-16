import {useEffect} from 'react';
import {useStores} from "../models/helpers/useStores";
import ApiService from "../services/api"; // Adjust the import path as needed

const apiService = new ApiService()

export default function useApiService() {
    const {authStore, clear} = useStores();

    apiService.setTokenUpdater(authStore.setAuthToken)

    useEffect(() => {
        if (authStore.authToken) {
            apiService.setAuthToken(authStore.authToken);
        }

        const handleAuthError = async (error: any) => {
            if (error.response.data.error === 'refresh_token_expired') {
                await apiService.logout()
                clear()
            }
        };

        apiService.onAuthError(handleAuthError);

        return () => {
            // Cleanup: Remove the error handler when the component unmounts or the effect re-runs
            apiService.errorHandlers = apiService.errorHandlers.filter(handler => handler !== handleAuthError);
        };

    }, [authStore.authToken]); // Re-run when authToken changes

    return apiService;
}
