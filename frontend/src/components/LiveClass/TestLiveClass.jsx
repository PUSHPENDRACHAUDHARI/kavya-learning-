import React from 'react';
import { useParams } from 'react-router-dom';

const TestLiveClass = () => {
    const { sessionId } = useParams();
    
    return (
        <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">Live Class Room</h1>
                <p className="text-xl text-gray-600 mb-2">Session ID: {sessionId}</p>
                <p className="text-gray-500">Testing basic component rendering...</p>
                <div className="mt-8 p-4 bg-white rounded-lg shadow-lg">
                    <p className="text-green-600">✅ Component loaded successfully!</p>
                </div>
            </div>
        </div>
    );
};

export default TestLiveClass;
