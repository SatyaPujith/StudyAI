import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const DebugPanel: React.FC = () => {
  const [endpoint, setEndpoint] = useState('/api/auth/login');
  const [method, setMethod] = useState('POST');
  const [requestBody, setRequestBody] = useState('{\n  "email": "",\n  "password": ""\n}');
  const [response, setResponse] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [baseUrl, setBaseUrl] = useState('http://localhost:5001');

  const handleRequest = async () => {
    try {
      let parsedBody = {};
      try {
        parsedBody = JSON.parse(requestBody);
      } catch (e) {
        toast.error('Invalid JSON in request body');
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const config = {
        method,
        url: `${baseUrl}${endpoint}`,
        headers,
        data: method !== 'GET' ? parsedBody : undefined,
        params: method === 'GET' ? parsedBody : undefined,
        withCredentials: true
      };

      console.log('Making request with config:', config);
      toast.info('Sending request...');
      
      try {
        const result = await axios(config);
        setResponse(JSON.stringify(result.data, null, 2));
        toast.success('Request successful');
        
        // If this is a login request and it succeeded, save the token
        if (endpoint.includes('/login') && result.data.token) {
          setToken(result.data.token);
          localStorage.setItem('token', result.data.token);
          toast.success('Token saved to localStorage');
        }
      } catch (error: any) {
        console.error('API request error:', error);
        setResponse(
          `Error: ${error.message}\n\n` +
          (error.response ? 
            `Status: ${error.response.status}\nData: ${JSON.stringify(error.response.data, null, 2)}` : 
            'No response data available')
        );
        toast.error('Request failed');
      }
    } catch (error: any) {
      console.error('Debug request error:', error);
      setResponse(
        JSON.stringify({
          error: error.message,
          response: error.response?.data || 'No response data'
        }, null, 2)
      );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            value={baseUrl} 
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="Base URL"
            className="flex-1"
          />
          <Input 
            value={endpoint} 
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="Endpoint"
            className="flex-1"
          />
          <select 
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        
        <div>
          <p className="text-sm mb-1">Request Body (JSON):</p>
          <Textarea 
            value={requestBody}
            onChange={(e) => setRequestBody(e.target.value)}
            rows={5}
            className="font-mono text-sm"
          />
        </div>
        
        <div>
          <p className="text-sm mb-1">Auth Token:</p>
          <div className="flex gap-2">
            <Input 
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="font-mono text-xs flex-1"
            />
            <Button 
              variant="outline" 
              onClick={() => {
                localStorage.removeItem('token');
                setToken('');
                toast.success('Token cleared');
              }}
              size="sm"
            >
              Clear
            </Button>
          </div>
        </div>
        
        <Button onClick={handleRequest}>Send Request</Button>
        
        <div>
          <p className="text-sm mb-1">Response:</p>
          <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-60 text-xs">
            {response || 'No response yet'}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebugPanel;