import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const SimpleLiveClass = () => {
    const { sessionId } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sessionData, setSessionData] = useState(null);

    useEffect(() => {
        console.log('SimpleLiveClass mounted with sessionId:', sessionId);
        
        // Simulate loading
        setTimeout(() => {
            setLoading(false);
            setSessionData({
                id: sessionId,
                title: 'Test Live Session',
                status: 'Testing'
            });
        }, 1000);
    }, [sessionId]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto"></div>
                    <p className="mt-6 text-gray-600 font-medium">Loading Live Class...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
                <div className="text-center">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-xl">
                        <p className="font-semibold">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="bg-gray-900/90 text-white p-4">
                <h1 className="text-xl font-bold">{sessionData.title}</h1>
                <p className="text-sm text-gray-300">Session ID: {sessionId}</p>
                <p className="text-sm text-green-400">Status: {sessionData.status}</p>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-white">
                    <div className="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <span className="text-4xl">📹</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Live Class Room</h2>
                    <p className="text-gray-300 mb-6">Video conference interface will appear here</p>
                    
                    <div className="flex justify-center gap-4">
                        <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg">
                            🎤 Mic On
                        </button>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg">
                            📹 Camera On
                        </button>
                        <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg">
                            📞 Leave
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimpleLiveClass;
