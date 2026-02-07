import React from 'react';
import GoogleMeetStyleRoom from '../components/LiveClass/GoogleMeetStyleRoom';
import ErrorBoundary from '../components/LiveClass/ErrorBoundary';

const LiveClassPage = () => {
    return (
        <ErrorBoundary>
            <GoogleMeetStyleRoom />
        </ErrorBoundary>
    );
};

export default LiveClassPage;
