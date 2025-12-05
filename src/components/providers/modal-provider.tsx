import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
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

    // Memoize modal methods to prevent recreation on every render
    const showStatusModal = useCallback((options: StatusModalOptions) => {
        setStatusModalOptions(options);
        setStatusModalVisible(true);
    }, []);

    const hideStatusModal = useCallback(() => {
        setStatusModalVisible(false);
    }, []);

    // Memoize context value to prevent unnecessary re-renders of consumers
    const value = useMemo<ModalContextType>(
        () => ({
            showStatusModal,
            hideStatusModal,
        }),
        [showStatusModal, hideStatusModal]
    );

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
