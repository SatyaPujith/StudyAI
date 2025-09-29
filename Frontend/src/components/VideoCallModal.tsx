import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  Users, 
  MessageCircle,
  Settings,
  Monitor,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '@/lib/utils';
import { io } from 'socket.io-client';
import api from '../lib/api';

interface VideoCallModalProps {
  groupId: string;
  sessionId: string;
  onClose: () => void;
}

interface Participant {
  id: string;
  name: string;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isHost: boolean;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({ 
  groupId, 
  sessionId, 
  onClose 
}) => {
  const { user } = useAuth();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: user?.id || '1',
      name: `${user?.firstName} ${user?.lastName}` || 'You',
      isVideoOn: true,
      isAudioOn: true,
      isHost: true
    },
    {
      id: '2',
      name: 'Alice Johnson',
      isVideoOn: true,
      isAudioOn: true,
      isHost: false
    },
    {
      id: '3',
      name: 'Bob Smith',
      isVideoOn: false,
      isAudioOn: true,
      isHost: false
    }
  ]);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: '1', user: 'Alice Johnson', message: 'Hey everyone! Ready to start?', time: '2:00 PM' },
    { id: '2', user: 'Bob Smith', message: 'Yes, let\'s begin with the React concepts', time: '2:01 PM' }
  ]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<any>(null);
  const [sessionInfo, setSessionInfo] = useState<{ joinCode?: string; meetingLink?: string } | null>(null);

  useEffect(() => {
    // Initialize video stream (placeholder)
    if (videoRef.current && isVideoOn) {
      // In a real implementation, you'd initialize WebRTC here
      videoRef.current.style.background = 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)';
    }
  }, [isVideoOn]);

  // Setup Socket.IO for real-time presence and chat
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_ORIGIN || 'http://localhost:5001');
    socketRef.current = socket;
    socket.emit('join-session-room', sessionId);
    
    socket.on('presence-joined', ({ socketId }) => {
      setParticipants(prev => {
        const exists = prev.some(p => p.id === socketId);
        if (exists) return prev;
        return [...prev, { id: socketId, name: `Participant ${socketId.slice(-4)}`, isVideoOn: true, isAudioOn: true, isHost: false }];
      });
    });
    
    socket.on('presence-left', ({ socketId }) => {
      setParticipants(prev => prev.filter(p => p.id !== socketId));
    });
    
    socket.on('session-message', (msg: any) => {
      setChatMessages(prev => [...prev, { id: `${Date.now()}`, user: msg.user, message: msg.content, time: new Date().toLocaleTimeString() }]);
    });
    
    socket.on('session-ended', () => {
      onClose();
    });
    
    return () => {
      socket.emit('leave-session-room', sessionId);
      socket.disconnect();
    };
  }, [sessionId]);

  // Fetch session details (link/code) for sharing
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await api.get(`/study-groups/${groupId}/sessions/${sessionId}`);
        if (res.data?.success) {
          setSessionInfo({
            joinCode: res.data.session?.joinCode,
            meetingLink: res.data.session?.meetingLink
          });
        }
      } catch (e) {
        // ignore
      }
    };
    fetchSession();
  }, [groupId, sessionId]);

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const sendChatMessage = () => {
    if (!newChatMessage.trim()) return;
    const payload = {
      sessionId,
      message: {
        user: `${user?.firstName} ${user?.lastName}` || 'You',
        content: newChatMessage
      }
    };
    socketRef.current?.emit('session-message', payload);
    setNewChatMessage('');
  };

  const endCall = () => {
    onClose();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl h-[80vh] p-0">
        <DialogHeader>
          <DialogTitle>Live Video Session</DialogTitle>
        </DialogHeader>
        <div className="flex h-full">
          {/* Main Video Area */}
          <div className="flex-1 bg-gray-900 relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Live Session</span>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {participants.length} participants
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowChat(!showChat)}
                    className="text-white hover:bg-white/20"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  {sessionInfo?.joinCode && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-white border-white/40 hover:bg-white/10"
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(sessionInfo.joinCode!); } catch {}
                      }}
                    >
                      Share Code
                    </Button>
                  )}
                  {sessionInfo?.meetingLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-white border-white/40 hover:bg-white/10"
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(sessionInfo.meetingLink!); } catch {}
                      }}
                    >
                      Copy Invite Link
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Video */}
            <div className="h-full flex items-center justify-center">
              {isVideoOn ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  style={{
                    background: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)'
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-white">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarFallback className="bg-gray-700 text-white text-2xl">
                      {getInitials(`${user?.firstName} ${user?.lastName}` || 'You')}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-lg font-medium">Camera is off</p>
                </div>
              )}
            </div>

            {/* Participant Videos */}
            <div className="absolute bottom-20 right-4 flex flex-col gap-2">
              {participants.slice(1).map((participant) => (
                <div
                  key={participant.id}
                  className="w-32 h-24 bg-gray-800 rounded-lg overflow-hidden relative"
                >
                  {participant.isVideoOn ? (
                    <div 
                      className="w-full h-full"
                      style={{
                        background: `linear-gradient(${Math.random() * 360}deg, #667eea 0%, #764ba2 100%)`
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gray-600 text-white text-xs">
                          {getInitials(participant.name)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  
                  <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                    <span className="text-xs text-white bg-black/50 px-1 rounded">
                      {participant.name.split(' ')[0]}
                    </span>
                    <div className="flex gap-1">
                      {!participant.isAudioOn && (
                        <MicOff className="h-3 w-3 text-red-400" />
                      )}
                      {participant.isHost && (
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleAudio}
                  className={cn(
                    "h-12 w-12 rounded-full",
                    isAudioOn 
                      ? "bg-gray-700 hover:bg-gray-600 text-white" 
                      : "bg-red-600 hover:bg-red-700 text-white"
                  )}
                >
                  {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleVideo}
                  className={cn(
                    "h-12 w-12 rounded-full",
                    isVideoOn 
                      ? "bg-gray-700 hover:bg-gray-600 text-white" 
                      : "bg-red-600 hover:bg-red-700 text-white"
                  )}
                >
                  {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleScreenShare}
                  className={cn(
                    "h-12 w-12 rounded-full",
                    isScreenSharing 
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  )}
                >
                  <Monitor className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={endCall}
                  className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <Phone className="h-5 w-5" />
                </Button>
                {participants[0]?.id === (user?.id || '') && participants[0]?.isHost && (
                  <Button
                    className="h-12 px-6 rounded-full bg-red-700 hover:bg-red-800 text-white"
                    onClick={async () => {
                      try {
                        await api.post(`/study-groups/${groupId}/sessions/${sessionId}/end`);
                      } catch (e) {
                        // no-op for demo
                      }
                    }}
                  >
                    End Meeting
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          {showChat && (
            <div className="w-80 bg-white border-l flex flex-col">
              <div className="p-4 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Session Chat
                </h3>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-900">{msg.user}</span>
                      <span className="text-xs text-gray-500">{msg.time}</span>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{msg.message}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    className="flex-1"
                  />
                  <Button onClick={sendChatMessage} size="icon">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallModal;