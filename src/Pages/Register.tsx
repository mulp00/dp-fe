import React, {useEffect, useState} from 'react';
import {
    Alert,
    Box,
    Button, Chip, CircularProgress,
    Container, Divider,
    FormControl,
    FormHelperText,
    IconButton,
    InputAdornment,
    InputLabel,
    OutlinedInput,
    Snackbar,
    TextField,
    Typography
} from '@mui/material';
import QRCode from 'react-qr-code';
// import * as mfkdf from '../utils/crypto/mfkdf/mfkdf.min';
import __wbg_init, {Identity, Provider} from "../utils/crypto/openmls";
import {z} from 'zod';
import {RegisterPayload} from "../services/api";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Visibility from "@mui/icons-material/Visibility";
import {ab2str, encryptStringWithAesCtr, importAesKey} from "../utils/crypto/aes/encryption";
import {useApiService} from "../hooks";
import {useNavigate} from "react-router-dom";

const mfkdf = require('mfkdf/mfkdf');

export const Register = function () {
    const [qr, setQr] = useState<string>('');
    const [registrationState, setRegistrationState] = useState<"initial"|"loading"|"complete">("initial");
    const [showPassword, setShowPassword] = React.useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isWasmInitialized, setWasmInitialized] = useState(false);
    const [isActive, setIsActive] = useState<boolean>(false)
    const apiService = useApiService()
    const [errors, setErrors] = useState({
        email: "",
        password: "",
        repeatPassword: ""
    });

    const navigate = useNavigate()

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
            if (registrationState === "complete") {
                e.preventDefault();
                e.returnValue = 'Jste si jistí, že jste načetli QR kód?';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [registrationState]);

    const handleClickShowPassword = () => setShowPassword((show) => !show);

    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    const [state, setState] = useState({
        email: '',
        password: '',
        repeatPassword: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setState(prevState => ({...prevState, [name]: value}));
        setErrors(prevErrors => ({...prevErrors, [name]: null})); // Reset error state on input change
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setRegistrationState("loading")

        let formErrors = {
            email: "",
            password: "",
            repeatPassword: ""
        };

        if (!z.string().email().safeParse(state.email).success) {
            formErrors.email = 'Prosím zadejte platnou emailovou adresu.';
        }

        if (!z.string().min(8).safeParse(state.password).success) {
            formErrors.password = 'Heslo musí mít nejméně 8 znaků.';
        }

        if (state.password !== state.repeatPassword) {
            formErrors.repeatPassword = 'Passwords do not match.';
        }

        if (formErrors.email || formErrors.password || formErrors.repeatPassword) {
            setErrors(formErrors);
            setRegistrationState("initial")

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
        console.log(setup.outputs.totp.uri)

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
            masterKey: ab2str(await crypto.subtle.digest("SHA-256", setup.key)),
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
            await apiService.register(payload);
            // Only set registration as complete if the registration succeeds
            setRegistrationState("complete");
        } catch (error) {
            const typedError = error as { response?: { status?: number, data?: any } };
            if (typedError.response && typedError.response.status === 409) {
                // Handle existing user error
                setError("Tento email je již používán");
            } else {
                // Handle other errors
                setError('An unexpected error occurred. Please try again.');
            }
            setRegistrationState("initial")
        }
    }

    return (
        <Box display="flex" alignItems="center" justifyContent="center" minHeight="75vh">
            <Container component="main" maxWidth="xs">
                {(registrationState === "initial" || registrationState === "loading") && (
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
                                error={!!errors.email}
                                helperText={errors.email}
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
                                    error={!!errors.password}
                                />
                                <FormHelperText error={!!errors.password}>
                                    {errors.password}
                                </FormHelperText>
                            </FormControl>
                            <FormControl fullWidth margin="normal">
                                <InputLabel htmlFor="repeatPassword">Zopakujte heslo</InputLabel>
                                <OutlinedInput
                                    id="repeatPassword"
                                    required
                                    fullWidth
                                    label="Zopakujte heslo"
                                    name="repeatPassword"
                                    value={state.repeatPassword}
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
                                    error={!!errors.repeatPassword}
                                />
                                <FormHelperText error={!!errors.repeatPassword}>
                                    {errors.repeatPassword}
                                </FormHelperText>
                            </FormControl>
                            <FormControl fullWidth margin="normal">
                                <Button type="submit" fullWidth variant="contained" color="primary"
                                        disabled={registrationState === "loading"}>
                                    Registrovat
                                </Button>
                            </FormControl>
                            {error && <Snackbar open={true} autoHideDuration={6000}>
                                <Alert severity="error">{error}</Alert>
                            </Snackbar>}
                        </form>
                        <Divider sx={{marginY: 3}}>
                            <Chip label="Máte již účet?" size="small"/>
                        </Divider>
                        <Button fullWidth variant="outlined" color="primary" onClick={() => navigate('/login')}>
                            Přihlášení
                        </Button>
                    </>
                )}

                {
                registrationState === "complete" &&
                    (
                    <>
                        <Typography variant="h4" gutterBottom>QR Kód</Typography>
                        <Typography variant="body1" gutterBottom>Ujistěte se, že jste si QR kód uložili. Potřebujete ho
                            pro další ověření.</Typography>
                        <QRCode value={qr}/>
                        <Divider sx={{marginY: 3}}/>
                        <Button fullWidth variant="outlined" color="primary" onClick={() => navigate('/login')}>
                            Přihlášení
                        </Button>
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
