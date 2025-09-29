import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, MessageCircle, Video, Clock, Search } from 'lucide-react';
import CreateGroupModal from './CreateGroupModal';
import GroupChatModal from './GroupChatModal';
import ScheduleSessionModal from './ScheduleSessionModal';
import VideoCallModal from './VideoCallModal';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface StudyGroup {
  id: string;
  name: string;
  members: number;
  activeMembers: string[];
  topic: string;
  nextSession: string;
  isActive: boolean;
  creatorId?: string;
}

const studyGroups: StudyGroup[] = [
  {
    id: 'mock-1',
    name: 'Data Structures & Algorithms',
    members: 8,
    activeMembers: ['AM', 'JS', 'MK', 'RW'],
    topic: 'Binary Trees',
    nextSession: '2:00 PM Today',
    isActive: true
  },
  {
    id: 'mock-2',
    name: 'Computer Networks',
    members: 6,
    activeMembers: ['TL', 'NK', 'SM'],
    topic: 'TCP/IP Protocol',
    nextSession: 'Tomorrow 10 AM',
    isActive: false
  }
];

const StudyGroupsView: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StudyGroup[]>(studyGroups);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGroupForChat, setSelectedGroupForChat] = useState<string | null>(null);
  const [selectedGroupForSchedule, setSelectedGroupForSchedule] = useState<string | null>(null);
  const [selectedGroupForVideo, setSelectedGroupForVideo] = useState<{ groupId: string; sessionId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);

  // Load groups from API
  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/study-groups');
      if (response.data.success) {
        // Map backend groups to frontend structure
        const mappedGroups = (response.data.groups || []).map((g: any) => {
          const membersArr = Array.isArray(g?.members) ? g.members : [];
          const initials = membersArr.slice(0, 4).map((m: any) => (
            m?.user?.name ? m.user.name.split(' ').map((n: string) => n[0]).join('') : 'U'
          ));
          return {
            id: g?._id || g?.id || '',
            name: g?.name || 'Untitled Group',
            members: membersArr.length,
            activeMembers: initials,
            topic: g?.subject || 'General',
            nextSession: 'TBD',
            isActive: false,
            creatorId: g?.creator?._id || g?.creator || undefined
          } as StudyGroup;
        });
        setGroups(mappedGroups);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups(studyGroups);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (groupData: any) => {
    try {
      setError(null);
      const response = await api.post('/study-groups', groupData);
      if (response.data.success) {
        const g = response.data.group;
        const membersArr = Array.isArray(g?.members) ? g.members : [];
        const mapped: StudyGroup = {
          id: g?._id || g?.id || '',
          name: g?.name || 'Untitled Group',
          members: membersArr.length,
          activeMembers: membersArr.slice(0, 4).map((m: any) => (
            m?.user?.name ? m.user.name.split(' ').map((n: string) => n[0]).join('') : 'U'
          )),
          topic: g?.subject || 'General',
          nextSession: 'TBD',
          isActive: false,
          creatorId: g?.creator?._id || g?.creator || undefined
        };
        setGroups(prev => [mapped, ...prev]);
        return mapped;
      } else {
        setError('Failed to create group.');
      }
    } catch (error) {
      setError('Error creating group.');
      throw error;
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-black tracking-tight">
            Study Groups
          </h2>
          <p className="text-gray-600 mt-1">
            Collaborate with peers and learn together
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Search Bar */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search groups by name or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter session code to join"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="flex-1 px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <Button
            disabled={!joinCode.trim() || isJoiningByCode}
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={async () => {
              try {
                setIsJoiningByCode(true);
                const res = await api.post('/study-groups/sessions/join-by-code', { code: joinCode.trim() });
                if (res.data?.success) {
                  setSelectedGroupForVideo({ groupId: res.data.groupId, sessionId: res.data.sessionId });
                }
              } catch (e) {
                // Optionally show toast
              } finally {
                setIsJoiningByCode(false);
              }
            }}
          >
            Join by Code
          </Button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No groups found' : 'No study groups yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Create your first study group to start collaborating with peers'
              }
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Group
              </Button>
            )}
          </div>
        ) : (
          (filteredGroups || []).map((group, index) => (
            <Card key={index} className="border-gray-100 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-black">
                    <Users className="h-5 w-5" />
                    {group.name}
                  </CardTitle>
                  {group.isActive && (
                    <Badge className="bg-green-50 text-green-700 border-green-200">
                      Active Session
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {(group.activeMembers || []).map((member, idx) => (
                        <Avatar key={idx} className="h-8 w-8 border-2 border-white">
                          <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                            {member}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {group.members > (group.activeMembers ? group.activeMembers.length : 0) && (
                        <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                          <span className="text-xs text-gray-600">
                            +{group.members - (group.activeMembers ? group.activeMembers.length : 0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">{group.members} members</span>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
                      <MessageCircle 
                        className="h-4 w-4 mr-1" 
                        onClick={() => setSelectedGroupForChat(group.id)}
                      />
                      Chat
                    </Button>
                    {group.isActive ? (
                      user?.id === group.creatorId ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            // Creator can end the meeting
                            setSelectedGroupForVideo({ groupId: group.id, sessionId: 'session-1' });
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Video className="h-4 w-4 mr-1" />
                          End Meeting
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setSelectedGroupForVideo({ groupId: group.id, sessionId: 'session-1' })}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Join Session
                        </Button>
                      )
                    ) : (
                      user?.id === group.creatorId ? (
                        <Button
                          size="sm"
                          onClick={() => setSelectedGroupForSchedule(group.id)}
                          className="bg-gray-900 hover:bg-gray-800 text-white"
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled
                          className="bg-gray-300 text-gray-600"
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Waiting for schedule
                        </Button>
                      )
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-600">Current topic: </span>
                    <span className="font-medium text-gray-900">{group.topic}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="h-4 w-4" />
                    {group.nextSession}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateGroup={handleCreateGroup}
      />
      
      {/* Chat Modal */}
      {selectedGroupForChat && (
        <GroupChatModal
          groupId={selectedGroupForChat}
          onClose={() => setSelectedGroupForChat(null)}
        />
      )}
      
      {/* Schedule Session Modal */}
      {selectedGroupForSchedule && (
        <ScheduleSessionModal
          groupId={selectedGroupForSchedule}
          onClose={() => setSelectedGroupForSchedule(null)}
          onScheduled={() => {
            setSelectedGroupForSchedule(null);
            loadGroups();
          }}
        />
      )}
      
      {/* Video Call Modal */}
      {selectedGroupForVideo && (
        <VideoCallModal
          groupId={selectedGroupForVideo.groupId}
          sessionId={selectedGroupForVideo.sessionId}
          onClose={() => setSelectedGroupForVideo(null)}
        />
      )}
    </div>
  );
};

export default StudyGroupsView;