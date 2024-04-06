import React, { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Modal, TextField, Typography } from '@mui/material';
import { GroupItemSnapshotIn } from "../../models/GroupItem/GroupItemModel";
import { cardSchema, loginSchema } from "./AddItemModal";
import { useStores } from "../../models/helpers/useStores";

interface ItemDetailModalProps {
    isOpen: boolean;
    handleClose: () => void;
    itemIndex: number;
    groupIndex: number;
    onUpdateItem: (itemDetail: GroupItemSnapshotIn) => Promise<boolean>;
    onFeedback: (type: 'success' | 'error', message: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
                                                                    isOpen,
                                                                    handleClose,
                                                                    itemIndex,
                                                                    groupIndex,
                                                                    onUpdateItem,
                                                                    onFeedback,
                                                                }) => {
    const [details, setDetails] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string> | null>({});
    const { groupStore } = useStores();

    useEffect(() => {
        if (isOpen) {
            try {
                const groupItem = groupStore.groups[groupIndex]?.groupItems[itemIndex];
                const parsedContent = groupItem?.content ? JSON.parse(groupItem.content) : {};
                setDetails({
                    ...parsedContent,
                    name: groupItem?.name,
                    description: groupItem?.description
                });
            } catch (error) {
                console.error("Failed to parse item content", error);
                onFeedback('error', 'Chyba při načítání detailů položky.');
            }
        }
    }, [isOpen, groupIndex, itemIndex, groupStore.groups]);

    useEffect(() => {
        if (!isOpen) {
            setErrors(null)
            setDetails({});
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        setLoading(true);
        setErrors({}); // Reset errors before validation

        const schema = groupStore.groups[groupIndex].groupItems[itemIndex].type === 'login' ? loginSchema : cardSchema;
        const validationResult = schema.safeParse(details);
        if (!validationResult.success) {
            // Accumulate all errors into the errors state
            const newErrors = validationResult.error.issues.reduce((acc, curr) => {
                acc[curr.path[0]] = curr.message;
                return acc;
            }, {} as Record<string, string>);
            setErrors(newErrors);
            setLoading(false);
            return;
        }

        try {
            const updatedItem: GroupItemSnapshotIn = {
                ...groupStore.groups[groupIndex].groupItems[itemIndex],
                content: JSON.stringify(validationResult.data),
                name: details.name,
                description: details.description
            };

            const success = await onUpdateItem(updatedItem);
            if (success) {
                onFeedback('success', 'Položka byla úspěšně aktualizována.');
                handleClose();
            } else {
                onFeedback('error', 'Aktualizace položky selhala. Zkuste to prosím znovu.');
            }
        } catch (error) {
            onFeedback('error', 'Došlo k neočekávané chybě.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setDetails({ ...details, [field]: e.target.value });
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
        <Modal open={isOpen} onClose={handleClose}>
            <Box sx={style}>
                <Typography id="modal-title" variant="h6" component="h2">
                    Detail
                </Typography>
                <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Název"
                        value={details?.name || ''}
                        onChange={handleChange('name')}
                        error={!!errors?.name}
                        helperText={errors?.name || ''}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Popis"
                        value={details?.description || ''}
                        onChange={handleChange('description')}
                        error={!!errors?.description}
                        helperText={errors?.description || ''}
                    />
                    {groupStore.groups[groupIndex]?.groupItems[itemIndex]?.type === 'login' && (
                        <>
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Uživatelské jméno"
                                value={details?.username || ''}
                                onChange={handleChange('username')}
                                error={!!errors?.username}
                                helperText={errors?.username || ''}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Heslo"
                                value={details?.password || ''}
                                onChange={handleChange('password')}
                                error={!!errors?.password}
                                helperText={errors?.password || ''}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Poznámky"
                                value={details?.notes || ''}
                                onChange={handleChange('notes')}
                                error={!!errors?.notes}
                                helperText={errors?.notes || ''}
                            />
                        </>
                    )}
                    {groupStore.groups[groupIndex]?.groupItems[itemIndex]?.type === 'card' && (
                        <>
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Číslo karty"
                                value={details?.cardNumber || ''}
                                onChange={handleChange('cardNumber')}
                                error={!!errors?.cardNumber}
                                helperText={errors?.cardNumber || ''}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Datum expirace"
                                value={details?.expiration || ''}
                                onChange={handleChange('expiration')}
                                error={!!errors?.expiration}
                                helperText={errors?.expiration || ''}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="CVV"
                                value={details?.cvv || ''}
                                onChange={handleChange('cvv')}
                                error={!!errors?.cvv}
                                helperText={errors?.cvv || ''}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Jméno držitele karty"
                                value={details?.cardholderName || ''}
                                onChange={handleChange('cardholderName')}
                                error={!!errors?.cardholderName}
                                helperText={errors?.cardholderName || ''}
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Poznámky"
                                value={details?.notes || ''}
                                onChange={handleChange('notes')}
                                error={!!errors?.notes}
                                helperText={errors?.notes || ''}
                            />
                        </>
                    )}

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? <CircularProgress size={24} /> : 'Aktualizovat'}
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Modal>

    );
};
