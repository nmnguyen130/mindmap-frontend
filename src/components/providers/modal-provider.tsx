import React, { createContext, useContext, useState, ReactNode } from 'react';
import StatusModal, { StatusButton, StatusType } from '@/components/ui/modal/status-modal';

// Status Modal Types
interface StatusModalOptions {
    type: StatusType;
    title: string;
    message: string;
    buttons?: StatusButton[];
}

// Modal Context Type
interface ModalContextType {
    // Status Modal
    showStatusModal: (options: StatusModalOptions) => void;
    hideStatusModal: () => void;

    // Future: Add other modal types here
    // showFormModal: (options: FormModalOptions) => void;
    // showConfirmModal: (options: ConfirmModalOptions) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Status Modal State
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [statusModalOptions, setStatusModalOptions] = useState<StatusModalOptions>({
        type: 'info',
        title: '',
        message: '',
    });

    // Status Modal Methods
    const showStatusModal = (options: StatusModalOptions) => {
        setStatusModalOptions(options);
        setStatusModalVisible(true);
    };

    const hideStatusModal = () => {
        setStatusModalVisible(false);
    };

    const value: ModalContextType = {
        showStatusModal,
        hideStatusModal,
    };

    return (
        <ModalContext.Provider value={value}>
            {children}

            {/* Status Modal */}
            <StatusModal
                visible={statusModalVisible}
                type={statusModalOptions.type}
                title={statusModalOptions.title}
                message={statusModalOptions.message}
                buttons={statusModalOptions.buttons}
                onDismiss={hideStatusModal}
            />

            {/* Future: Add other modals here */}
            {/* <FormModal ... /> */}
            {/* <ConfirmModal ... /> */}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
};

// Convenience hook for status modal only
export const useStatusModal = () => {
    const { showStatusModal, hideStatusModal } = useModal();
    return { showStatusModal, hideStatusModal };
};
