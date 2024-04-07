import {observer} from "mobx-react";
import {Box, Button, CircularProgress, FormControl, Modal, TextField, Typography} from "@mui/material";
import React, {useState} from "react";

export type ConfirmModalProps = {
    isOpen: boolean;
    onHandleClose: () => any;
    onHandleSubmit: () => any;
    title: string;
    text: string;
    confirmText?: string;
    successMessage: string;
    onFeedback: (type: 'success' | 'error', message: string) => void;
};

export const ConfirmModal = observer(function ConfirmModal({
                                                               isOpen,
                                                               onHandleClose,
                                                               onHandleSubmit,
                                                               title,
                                                               text,
                                                               confirmText,
                                                               successMessage,
                                                               onFeedback,
                                                           }: ConfirmModalProps) {

    const [state, setState] = useState<"ready" | "loading" >("ready");

    const style = {
        position: 'absolute' as 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        border: '2px solid #000',
        boxShadow: 24,
        p: 4,
    };

    const handleSubmit = async () => {
        if (!onHandleSubmit) {
            console.error("handleSubmit function is not provided");
            return;
        }
        setState("loading");
        try {
            await onHandleSubmit();
            onFeedback('success', successMessage)
            handleClose()
        } catch (error) {
            onFeedback('error', "Něco se pokazilo")
            handleClose()
        }
    };

    const handleClose = () => {
        setState('ready')
        onHandleClose()
    }

    return <Modal
        open={isOpen}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
    >
        <Box sx={style}>
            {state === "ready" && (
                <Box>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                        {title}
                    </Typography>
                    <Typography id="modal-modal-description" sx={{mt: 2}}>
                        {text}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mt={2}>
                        <Button variant="outlined" onClick={handleClose}>Zavřít</Button>
                        {confirmText && state === "ready" && (
                            <Button variant="contained" type="button" color="primary"
                                    onClick={handleSubmit}>{confirmText}</Button>
                        )}
                    </Box>
                </Box>
            )}
            {state === "loading" && (
                <Box display="flex" justifyContent="center">
                    <CircularProgress/>
                </Box>
            )}
        </Box>
    </Modal>
})