import {observer} from "mobx-react";
import {Box, Button, CircularProgress, FormControl, Modal, TextField, Typography} from "@mui/material";
import React, {useState} from "react";

export type ConfirmModalProps = {
    isOpen: boolean;
    handleClose: () => any;
    handleSubmit: () => any;
    title: string;
    text: string;
    confirmText?: string;
    successMessage: string;
};

export const ConfirmModal = observer(function ConfirmModal(props: ConfirmModalProps) {

    const [state, setState] = useState<"ready" | "loading" | "success" | "error">("ready");
    const [message, setMessage] = useState("");

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
        if (!props.handleSubmit) {
            console.error("handleSubmit function is not provided");
            return;
        }
        setState("loading");
        try {
            await props.handleSubmit();
            setState("success");
            setMessage(props.successMessage);
        } catch (error) {
            setState("error");
            setMessage("Něco se pokazilo");
        }
    };

    const handleClose = () => {
        setState('ready')
        props.handleClose()
    }

    return <Modal
        open={props.isOpen}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
    >
        <Box sx={style}>
            {state === "ready" && (
                <Box>
                    <Typography id="modal-modal-title" variant="h6" component="h2">
                        {props.title}
                    </Typography>
                    <Typography id="modal-modal-description" sx={{mt: 2}}>
                        {props.text}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mt={2}>
                        <Button variant="outlined" onClick={handleClose}>Zavřít</Button>
                        {props.confirmText && state === "ready" && (
                            <Button variant="contained" type="button" color="primary"
                                    onClick={handleSubmit}>{props.confirmText}</Button>
                        )}
                    </Box>
                </Box>
            )}
            {state === "loading" && (
                <Box display="flex" justifyContent="center">
                    <CircularProgress/>
                </Box>
            )}
            {(state === "success") && (
                <Box textAlign="center">
                    <Typography variant="body1" sx={{mb: 2}}>
                        {message}
                    </Typography>
                    <Button variant="contained" onClick={handleClose}>Zavřít</Button>
                </Box>
            )}
            {(state === "error") && (
                <Box textAlign="center">
                    <Typography variant="body1" sx={{mb: 2}}>
                        Něco se pokazilo
                    </Typography>
                    <Button variant="contained" onClick={handleClose}>Zavřít</Button>
                </Box>
            )}
        </Box>
    </Modal>
})