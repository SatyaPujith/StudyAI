import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, MessageCircle, Video, Clock, Search } from 'lucide-react';
import CreateGroupModal from './CreateGroupModal';
import api from '../lib/api';

interface StudyGroup {
  name: string;
  members: number;
  activeMembers: string[];
  topic: string;
  nextSession: string;
  isActive: boolean;
}

const studyGroups: StudyGroup[] = [
  {
    name: 'Data Structures & Algorithms',
    members: 8,
    activeMembers: ['AM', 'JS', 'MK', 'RW'],
    topic: 'Binary Trees',
    nextSession: '2:00 PM Today',
    isActive: true
  },
  {
    name: 'Computer Networks',
    members: 6,
    activeMembers: ['TL', 'NK', 'SM'],
    topic: 'TCP/IP Protocol',
    nextSession: 'Tomorrow 10 AM',
    isActive: false
  }
];

const StudyGroupsView: React.FC = () => {
  const [groups, setGroups] = useState<StudyGroup[]>(studyGroups);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

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
        const mappedGroups = (response.data.groups || []).map(g => ({
          name: g.name,
          members: g.members.length,
          activeMembers: g.members
            .slice(0, 4)
            .map(m => (m.user.name ? m.user.name.split(' ').map(n => n[0]).join('') : 'U')), // initials or 'U'
          topic: g.subject || 'General',
          nextSession: 'TBD', // or use a real field if available
          isActive: false // or use a real field if available
        }));
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
        setGroups(prev => [response.data.group, ...prev]);
        return response.data.group;
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
                      {group.members > group.activeMembers.length && (
                        <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                          <span className="text-xs text-gray-600">
                            +{group.members - group.activeMembers.length}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">{group.members} members</span>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                    <Button
                      size="sm"
                      className={group.isActive
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-gray-900 hover:bg-gray-800 text-white"
                      }
                    >
                      <Video className="h-4 w-4 mr-1" />
                      {group.isActive ? 'Join Session' : 'Schedule'}
                    </Button>
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
    </div>
  );
};

export default StudyGroupsView;