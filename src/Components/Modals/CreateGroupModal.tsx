import React, { useState, useEffect, useRef } from 'react';
import { observer } from "mobx-react";
import { Box, Button, CircularProgress, FormControl, IconButton, Modal, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export type CreateGroupModalProps = {
    isOpen: boolean;
    onHandleClose: () => void;
    onHandleSubmit: (name: string) => Promise<void>;
    onFeedback: (type: 'success' | 'error', message: string) => void;
};

export const CreateGroupModal = observer(function CreateGroupModal({ isOpen, onHandleClose, onHandleSubmit, onFeedback }: CreateGroupModalProps) {
    const [loading, setLoading] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [groupNameError, setGroupNameError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);


    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 100);
        }
    }, [isOpen]);

    const validateGroupName = (name: string) => {
        if (name.length >= 4) {
            setGroupNameError("");
            return true;
        } else {
            setGroupNameError("Název skupiny musí být alespoň 4 znaky dlouhý.");
            return false;
        }
    };

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // Prevent the form from causing a page reload
        if (!validateGroupName(groupName)) {
            return;
        }
        setLoading(true);
        try {
            await onHandleSubmit(groupName);
            onFeedback('success', 'Skupina vytvořena');
        } catch (error) {
            console.error(error)
            onFeedback('error', 'Něco se pokazilo');
        } finally {
            setLoading(false);
            handleCloseModal();
        }
    };

    const handleCloseModal = () => {
        if (!loading) { // Prevent closing if loading
            onHandleClose();
            setTimeout(() => {
                setGroupName("");
                setGroupNameError("");
            }, 300);
        }
    };

    const style = {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
    };

    return (
        <Modal
            open={isOpen}
            onClose={handleCloseModal}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
        >
            <Box sx={style} component="form" onSubmit={handleFormSubmit} noValidate>
                <IconButton sx={{position: "fixed", top: 5, right: 5}} onClick={onHandleClose}>
                    <CloseIcon/>
                </IconButton>
                <FormControl fullWidth>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                        Vytvořit novou skupinu
                    </Typography>
                    <TextField
                        autoFocus
                        required
                        label="Název"
                        value={groupName}
                        onChange={(e) => {
                            setGroupName(e.target.value);
                            validateGroupName(e.target.value); // Validate on change
                        }}
                        margin="normal"
                        error={!!groupNameError}
                        helperText={groupNameError}
                        inputRef={inputRef}
                    />
                    <Box display="flex" justifyContent="space-between" mt={2}>
                        <Button type="submit" variant="contained" disabled={loading}>
                            {loading ? <CircularProgress size={24} /> : 'Vytvořit'}
                        </Button>
                    </Box>
                </FormControl>
            </Box>
        </Modal>
    );
});
