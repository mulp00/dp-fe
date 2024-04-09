import React, {useEffect, useState} from 'react';
import {
    Container, TextField, Button, Typography, OutlinedInput,
    InputAdornment, IconButton, InputLabel, FormControl, Box, Snackbar, Alert
} from '@mui/material';
import QRCode from 'react-qr-code';
// import * as mfkdf from '../utils/crypto/mfkdf/mfkdf.min';
import __wbg_init, {Identity, Provider} from "../utils/crypto/openmls";
import {z} from 'zod';
import api, {RegisterPayload} from "../services/api";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Visibility from "@mui/icons-material/Visibility";
import {encryptStringWithAesCtr, importAesKey} from "../utils/crypto/aes/encryption";
const mfkdf = require('mfkdf/mfkdf');

const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    // Include other fields as necessary
});

export const Register = function () {
    const [qr, setQr] = useState<string>('');
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isWasmInitialized, setWasmInitialized] = useState(false);

    useEffect(() => {
        const initializeWasm = async () => {
            await __wbg_init();
            setWasmInitialized(true);
        };

        if (!isWasmInitialized) {
            initializeWasm();
        }
    }, [isWasmInitialized]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (registrationComplete) {
                e.preventDefault();
                e.returnValue = 'Jste si jistí, že jste načetli QR kód?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [registrationComplete]);

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    const [state, setState] = useState({
        email: '',
        password: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setState(prevState => ({...prevState, [name]: value}));
        setError(null); // Reset error state on input change
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Reset error state at the beginning of form submission
        setError(null);

        // Validate input using Zod
        const result = RegisterSchema.safeParse({
            email: state.email,
            password: state.password,
        });

        if (!result.success) {
            setError("Vyplňte prosím správně všechan pole.");
            return;
        }

        if (!isWasmInitialized) {
            console.error("WebAssembly is not initialized.");
            setError("Initialization error, please reload the page.");
            return;
        }

        const provider = new Provider();
        const identity = new Identity(provider, state.email);
        const keyPackage = identity.key_package(provider)
        const serialized_keyPackage = keyPackage.serialize()
        const serialized_identity = identity.serialize();
        const serialized_keyStore = provider.serialize();


        const setup = await mfkdf.setup.key([
            await mfkdf.setup.factors.password(state.password),
            await mfkdf.setup.factors.totp({
                label: state.email,
                issuer: "SHARY",
            }),
        ], {size: 32});

        setQr(setup.outputs.totp.uri);

        const aesKey = await importAesKey(setup.key);

        const {
            ciphertext: serialized_identity_ciphertext,
            iv: serialized_identity_iv
        } = await encryptStringWithAesCtr(serialized_identity, aesKey)
        const {
            ciphertext: serialized_keyStore_ciphertext,
            iv: serialized_keyStore_iv
        } = await encryptStringWithAesCtr(serialized_keyStore, aesKey)

        const payload: RegisterPayload = {
            email: state.email,
            password: state.password,
            masterKey: setup.key.toString('hex'),
            mfkdfpolicy: {
                policy: JSON.stringify(setup.policy),
            },
            serializedIdentity: {ciphertext: serialized_identity_ciphertext, iv: serialized_identity_iv},
            keyPackage: serialized_keyPackage,
            keyStore: {ciphertext: serialized_keyStore_ciphertext, iv: serialized_keyStore_iv},
        };

        provider.free()
        identity.free()
        keyPackage.free()

        try {
            await api.register(payload);
            // Only set registration as complete if the registration succeeds
            setRegistrationComplete(true);
        } catch (error) {
            const typedError = error as { response?: { status?: number, data?: any } };
            if (typedError.response && typedError.response.status === 409) {
                // Handle existing user error
                setError("Tento email je již používán");
            } else {
                // Handle other errors
                setError('An unexpected error occurred. Please try again.');
            }
        }
    }

    return (
        <Box display="flex" alignItems="center" justifyContent="center" minHeight="75vh">
            <Container component="main" maxWidth="xs">
                {!registrationComplete ? (
                    <>
                        <Typography component="h1" variant="h5">Registrace</Typography>
                        <form onSubmit={handleSubmit}>
                            <TextField
                                variant="outlined"
                                margin="normal"
                                required
                                fullWidth
                                label="Email"
                                name="email"
                                autoComplete="email"
                                autoFocus
                                value={state.email}
                                onChange={handleChange}
                                error={!!error}
                                helperText={error}
                            />
                            <FormControl fullWidth margin="normal">
                                <InputLabel htmlFor="password">Heslo</InputLabel>
                                <OutlinedInput
                                    id="password"
                                    required
                                    fullWidth
                                    label="Heslo"
                                    name="password"
                                    value={state.password}
                                    onChange={handleChange}
                                    type={showPassword ? 'text' : 'password'}
                                    endAdornment={
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={handleClickShowPassword}
                                                onMouseDown={handleMouseDownPassword}
                                                edge="end"
                                            >
                                                {showPassword ? <VisibilityOff/> : <Visibility/>}
                                            </IconButton>
                                        </InputAdornment>
                                    }
                                    error={!!error}
                                />
                            </FormControl>
                            <Button type="submit" fullWidth variant="contained" color="primary">
                                Registrovat
                            </Button>
                            {error && <Snackbar open={true} autoHideDuration={6000}>
                                <Alert severity="error">{error}</Alert>
                            </Snackbar>}
                        </form>
                    </>
                ) : (
                    <>
                        <Typography variant="h4" gutterBottom>QR Kód</Typography>
                        <Typography variant="body1" gutterBottom>Ujistěte se, že jste si QR kód uložili. Potřebujete ho
                            pro další ověření.</Typography>
                        <QRCode value={qr}/>
                    </>
                )}
            </Container>
            {error && (
                <Snackbar open={Boolean(error)} autoHideDuration={6000} onClose={() => setError(null)}>
                    <Alert onClose={() => setError(null)} severity="error" sx={{width: '100%'}}>
                        {error}
                    </Alert>
                </Snackbar>
            )}
        </Box>
    );
}
