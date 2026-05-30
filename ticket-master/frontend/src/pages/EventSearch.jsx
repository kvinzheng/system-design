import React, { useState } from 'react';
import { searchEvents } from '../api';

function EventSearch({ onSelect }) {
  const [keyword, setKeyword] = useState('');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await searchEvents({ keyword });
    setEvents(res.data.events);
    setLoading(false);
  };

  return (
    <div>
      <form onSubmit={handleSearch}>
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Search events..." />
        <button type="submit">Search</button>
      </form>
      {loading && <div>Loading...</div>}
      <ul>
        {events.map(ev => (
          <li key={ev.id}>
            <button onClick={() => onSelect(ev.id)}>{ev.name} ({new Date(ev.date).toLocaleString()})</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EventSearch;
