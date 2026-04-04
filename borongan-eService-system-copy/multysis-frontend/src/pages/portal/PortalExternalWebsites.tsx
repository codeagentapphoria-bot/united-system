import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { FiArrowRight, FiClipboard, FiCheckCircle, FiExternalLink, FiSearch, FiUser } from 'react-icons/fi';

export const PortalExternalWebsites: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const externalWebsites = [
    {
      name: 'Borongan Libre-Sakay Program',
      description: 'Track and monitor bus locations in real-time across Borongan City routes.',
      url: 'https://libre-sakay-web.vercel.app/',
      category: 'Transportation',
    },
  ];

  const filteredWebsites = externalWebsites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PortalLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-heading-700 mb-4">External Websites</h1>
              <p className="text-lg text-heading-600">Access external government platforms and services.</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-heading-400" size={20} />
            <Input
              type="text"
              placeholder="Search external websites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredWebsites.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-heading-600">No external websites found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWebsites.map((site, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow flex flex-col h-full border-primary-200">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <FiExternalLink size={20} className="text-primary-600" />
                    <Badge className="bg-primary-100 text-primary-700 border-primary-200">{site.category}</Badge>
                  </div>
                  <CardTitle className="text-xl text-heading-700">{site.name}</CardTitle>
                  <CardDescription className="text-base mt-2">{site.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <a
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <Button variant="outline" className="w-full border-primary-600 text-primary-600 hover:bg-primary-50">
                      Visit Website <FiArrowRight className="ml-2" size={16} />
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};