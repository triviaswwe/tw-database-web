import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
};

function RecordCard({ record, type, isPotential }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const getCategoryName = (type) => {
    switch (type) {
      case 'main': return 'Maincard';
      case 'tag': return 'Tag Team';
      case 'mid': 
      case 'ic':
      case 'us': return 'Midcard';
      default: return 'Unknown';
    }
  };

  // Format titles
  const allTitles = isPotential ? record.titles.concat({ 
    missing: true, 
    type: record.missing,
    championship_id: record.missingTitle?.[0]?.championship_id || 9999,
    missingOptions: record.missingTitle || []
  }) : record.titles;
  
  const sortedIcons = [...allTitles].sort((a, b) => a.championship_id - b.championship_id);
  
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 bg- dark:bg-gray-800 shadow-sm">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-4">
          <img 
            src={record.wrestlerImage || '/placeholder.png'} 
            alt={record.wrestlerName} 
            className="w-16 h-16 object-cover rounded-full bg-gray-100 dark:bg-gray-700"
          />
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              <Link href={`/wrestlers/${record.wrestlerId}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                {record.wrestlerName}
              </Link>
            </h4>
            {!isPotential && (
              <p className="text-sm text-gray-500">
                Achieved on {formatDate(record.achievedDate)}
                {record.times > 1 && ` (${record.times}x)`}
              </p>
            )}
            {isPotential && (
              <p className="text-sm text-gray-500">
                Missing 1 title for {record.times > 1 ? `${record.times}x ` : ''}{type}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Images of belts */}
          <div className="flex gap-2 mr-4">
            {sortedIcons.map((t, idx) => {
              if (t.missing) {
                const options = t.missingOptions;
                const titleText = `${getCategoryName(t.type)} Championship Requirement`;
                
                if (options.length === 0) {
                  return (
                    <div key={`missing-${idx}`} title={titleText} className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center opacity-20">
                      <span className="text-xs text-center font-bold text-gray-500">{t.type.toUpperCase()}</span>
                    </div>
                  );
                } else if (options.length === 1) {
                  return (
                    <img 
                      key={`missing-${idx}`} 
                      src={options[0].title_image} 
                      alt={options[0].title_name} 
                      title={titleText}
                      className="w-12 h-12 object-contain opacity-20"
                    />
                  );
                } else {
                  return (
                    <div key={`missing-${idx}`} title={titleText} className="relative w-12 h-12 opacity-20">
                      <img 
                        src={options[0].title_image} 
                        alt={options[0].title_name} 
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }}
                      />
                      <img 
                        src={options[1].title_image} 
                        alt={options[1].title_name} 
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }}
                      />
                    </div>
                  );
                }
              }
              return (
                <img 
                  key={t.championship_id} 
                  src={t.title_image || '/belt-placeholder.png'} 
                  alt={t.title_name} 
                  title={t.title_name}
                  className="w-12 h-12 object-contain"
                />
              );
            })}
          </div>
          <button className="text-gray-500 focus:outline-none">
            {isOpen ? '▲' : '▼'}
          </button>
        </div>
      </div>
      
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            {record.titles.map(t => (
              <li key={t.championship_id} className="flex justify-between">
                <span className="font-medium">{t.title_name}</span>
                <span>{formatDate(t.won_date)}</span>
              </li>
            ))}
            {isPotential && (
              <li className="flex justify-between text-gray-400 italic">
                <span>{getCategoryName(record.missing)} Championship Requirement</span>
                <span>—</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ChampionshipRecords() {
  const { data, error } = useSWR('/api/championships/records', fetcher);
  const [activeTab, setActiveTab] = useState('grand_slam');

  if (error) return <div className="text-red-500">Failed to load records.</div>;
  if (!data) return <div className="text-gray-500 my-4">Loading records...</div>;

  return (
    <div className="mb-8">
      
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('grand_slam')}
          className={`px-4 py-2 rounded font-semibold transition-colors ${
            activeTab === 'grand_slam'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Grand Slam Championship
        </button>
        <button
          onClick={() => setActiveTab('triple_crown')}
          className={`px-4 py-2 rounded font-semibold transition-colors ${
            activeTab === 'triple_crown'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          Triple Crown Championship
        </button>
      </div>
      
      <div className="w-full flex-1">
        {activeTab === 'grand_slam' && (
          <div className="w-full flex-1">
            <h3 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400">Grand Slam Champions</h3>
            {data.grandSlams.length === 0 ? (
              <p className="text-gray-500 italic">No Grand Slam champions yet.</p>
            ) : (
              data.grandSlams.map((r, i) => (
                <RecordCard key={`${r.wrestlerId}-${r.times}`} record={r} type="Grand Slam" isPotential={false} />
              ))
            )}
            
            {data.potentialGrandSlams.length > 0 && (
              <div className="mt-8 w-full flex-1">
                <h4 className="text-lg font-semibold mb-3 text-gray-600 dark:text-gray-400">Potential Grand Slam Champions</h4>
                {data.potentialGrandSlams.map(r => (
                  <RecordCard key={r.wrestlerId} record={r} type="Grand Slam" isPotential={true} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'triple_crown' && (
          <div className="w-full flex-1">
            <h3 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-400">Triple Crown Champions</h3>
            {data.tripleCrowns.length === 0 ? (
              <p className="text-gray-500 italic">No Triple Crown champions yet.</p>
            ) : (
              data.tripleCrowns.map((r, i) => (
                <RecordCard key={`${r.wrestlerId}-${r.times}`} record={r} type="Triple Crown" isPotential={false} />
              ))
            )}

            {data.potentialTripleCrowns.length > 0 && (
              <div className="mt-8 w-full flex-1">
                <h4 className="text-lg font-semibold mb-3 text-gray-600 dark:text-gray-400">Potential Triple Crown Champions</h4>
                {data.potentialTripleCrowns.map(r => (
                  <RecordCard key={r.wrestlerId} record={r} type="Triple Crown" isPotential={true} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
