import React, {useEffect, useState} from 'react';
import {Box, Button, CircularProgress, IconButton, Modal, TextField, Typography} from '@mui/material';
import {z} from 'zod';
import {GroupItemSnapshotIn} from "../../models/GroupItem/GroupItemModel";
import {useStores} from "../../models/helpers/useStores";
import CloseIcon from '@mui/icons-material/Close';

interface AddItemModalProps {
    isOpen: boolean;
    onHandleClose: () => void;
    groupIndex: number;
    type: string;
    onItemCreate: (groupIndex: number, groupItem: GroupItemSnapshotIn) => Promise<boolean>;
    onFeedback: (type: 'success' | 'error', message: string) => void;
}

export const loginSchema = z.object({
    username: z.string().min(1, "Uživatelské jméno je povinné"),
    password: z.string().min(1, "Heslo je povinné"),
    notes: z.string().optional(),
    description: z.string().optional(),
});

export const cardSchema = z.object({
    cardNumber: z.string().min(15, "Číslo karty je povinné, musí být nejméně 15 čísel dlouhé"),
    expiration: z.string().min(1, "Datum expirace je povinné"),
    cvv: z.string().min(1, "CVV je povinné"),
    cardholderName: z.string().min(1, "Jméno držitele karty je povinné"),
    notes: z.string().optional(),
    description: z.string().optional(),
});

export const AddItemModal: React.FC<AddItemModalProps> = ({
                                                              isOpen,
                                                              onHandleClose,
                                                              groupIndex,
                                                              type,
                                                              onItemCreate,
                                                              onFeedback
                                                          }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loginDetails, setLoginDetails] = useState({username: '', password: '', notes: '', description: ''});
    const [cardDetails, setCardDetails] = useState({
        cardNumber: '',
        expiration: '',
        cvv: '',
        cardholderName: '',
        notes: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const {groupStore} = useStores()

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setDescription('');
            setLoginDetails({username: '', password: '', notes: '', description: ''});
            setCardDetails({
                cardNumber: '',
                expiration: '',
                cvv: '',
                cardholderName: '',
                notes: '',
                description: ''
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (type === 'login') {
            setDescription(loginDetails.username);
            setLoginDetails(prev => ({...prev, description: loginDetails.username}));
        } else if (type === 'card' && cardDetails.cardNumber) {
            // Anonymize card number for description
            const anonymizedCardNumber = cardDetails.cardNumber.replace(/.(?=.{4})/g, '*');
            setDescription(anonymizedCardNumber);
            setCardDetails(prev => ({...prev, description: anonymizedCardNumber}));
        }
    }, [loginDetails.username, cardDetails.cardNumber, type]);

    const handleSubmit = async () => {
        setLoading(true);
        setErrors({}); // Reset errors before validation

        let validationSchema;
        let formData;

        if (type === 'login') {
            validationSchema = loginSchema;
            formData = {...loginDetails, name, description};
        } else { // 'card'
            validationSchema = cardSchema;
            formData = {...cardDetails, name, description};
        }

        const result = validationSchema.safeParse(formData);
        if (!result.success) {
            // Accumulate all errors into the errors state
            const newErrors = result.error.issues.reduce((acc, curr) => {
                acc[curr.path[0]] = curr.message;
                return acc;
            }, {} as Record<string, string>);
            setErrors(newErrors);
            setLoading(false);
            return;
        }

        try {
            let content = '';
            let descriptionToUse = '';

            if (type === 'login') {
                const parsedLoginDetails = loginSchema.parse({...loginDetails, description: description});
                content = JSON.stringify(parsedLoginDetails);
                descriptionToUse = description; // Directly use the description state
            } else if (type === 'card') {
                const anonymizedCardNumber = cardDetails.cardNumber.replace(/.(?=.{4})/g, '*');
                const parsedCardDetails = cardSchema.parse({...cardDetails, description: anonymizedCardNumber});
                content = JSON.stringify(parsedCardDetails);
                descriptionToUse = anonymizedCardNumber;
            }

            const item: GroupItemSnapshotIn = {
                name,
                groupId: groupStore.groups[groupIndex].groupId,
                type,
                content,
                id: "",
                description: descriptionToUse,
                iv: "",
                decrypted: true,
            };

            const success = await onItemCreate(groupIndex, item);
            if (success) {
                onFeedback('success', 'Položka byla úspěšně přidána.');
                resetForm();
            } else {
                onFeedback('error', 'Přidání položky selhalo. Zkuste to prosím znovu.');
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                onFeedback('error', 'Ověření selhalo. Zkontrolujte prosím svůj vstup.');
            } else {
                onFeedback('error', 'Došlo k neočekávané chybě.');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setLoginDetails({username: '', password: '', notes: '', description: ''});
        setCardDetails({
            cardNumber: '',
            expiration: '',
            cvv: '',
            cardholderName: '',
            notes: '',
            description: ''
        });
        onHandleClose();
    };

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newUsername = e.target.value;
        setLoginDetails({...loginDetails, username: newUsername});
        // Update description only if it hasn't been manually edited or is empty
        if (description === loginDetails.username || description === '') {
            setDescription(newUsername);
        }
    };

    const style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
    };

    return (
        <Modal open={isOpen} onClose={onHandleClose}>
            <Box sx={style}>
                <IconButton sx={{position: "fixed", top: 5, right: 5}} onClick={onHandleClose}>
                    <CloseIcon/>
                </IconButton>
                <Typography id="modal-title" variant="h6" component="h2">
                    Přidat novou položku
                </Typography>
                <Box component="form" noValidate autoComplete="off" sx={{mt: 2}}>
                    <TextField fullWidth margin="normal" label="Název" value={name}
                               onChange={(e) => setName(e.target.value)}/>
                    {type === 'login' && (
                        <>
                            <TextField fullWidth margin="normal" label="Uživatelské jméno"
                                       value={loginDetails.username}
                                       onChange={handleUsernameChange}
                                       error={!!errors.username}
                                       helperText={errors.username || ''}
                            />
                            <TextField fullWidth margin="normal" label="Heslo"
                                       value={loginDetails.password}
                                       onChange={(e) => setLoginDetails({
                                           ...loginDetails,
                                           password: e.target.value
                                       })}
                                       error={!!errors.password}
                                       helperText={errors.password || ''}
                            />
                            <TextField fullWidth margin="normal" label="Popis"
                                       value={description}
                                       onChange={(e) => setDescription(e.target.value)}
                                       error={!!errors.description}
                                       helperText={errors.description || ''}
                            />
                            <TextField fullWidth margin="normal" label="Poznámky"
                                       value={loginDetails.notes}
                                       onChange={(e) => setLoginDetails({...loginDetails, notes: e.target.value})}
                                       error={!!errors.notes}
                                       helperText={errors.notes || ''}
                            />
                        </>
                    )}
                    {type === 'card' && (
                        <>
                            <TextField fullWidth margin="normal" label="Číslo karty"
                                       value={cardDetails.cardNumber}
                                       onChange={(e) => setCardDetails({
                                           ...cardDetails,
                                           cardNumber: e.target.value
                                       })}
                                       error={!!errors.cardNumber}
                                       helperText={errors.cardNumber || ''}
                            />
                            <TextField fullWidth margin="normal" label="Datum expirace"
                                       value={cardDetails.expiration}
                                       onChange={(e) => setCardDetails({
                                           ...cardDetails,
                                           expiration: e.target.value
                                       })}
                                       error={!!errors.expiration}
                                       helperText={errors.expiration || ''}
                            />
                            <TextField fullWidth margin="normal" label="CVV"
                                       value={cardDetails.cvv}
                                       onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                                       error={!!errors.cvv}
                                       helperText={errors.cvv || ''}
                            />
                            <TextField fullWidth margin="normal" label="Jméno držitele karty"
                                       value={cardDetails.cardholderName}
                                       onChange={(e) => setCardDetails({
                                           ...cardDetails,
                                           cardholderName: e.target.value
                                       })}
                                       error={!!errors.cardholderName}
                                       helperText={errors.cardholderName || ''}
                            />
                            <TextField fullWidth margin="normal" label="Popis"
                                       value={description}
                                       onChange={(e) => setDescription(e.target.value)}
                                       error={!!errors.description}
                                       helperText={errors.description || ''}
                            />
                            <TextField fullWidth margin="normal" label="Poznámky"
                                       value={cardDetails.notes}
                                       onChange={(e) => setCardDetails({...cardDetails, notes: e.target.value})}
                                       error={!!errors.notes}
                                       helperText={errors.notes || ''}
                            />
                        </>
                    )}
                    <Box sx={{mt: 3, display: 'flex', justifyContent: 'flex-end'}}>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? <CircularProgress size={24}/> : 'Odeslat'}
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Modal>
    );
};
