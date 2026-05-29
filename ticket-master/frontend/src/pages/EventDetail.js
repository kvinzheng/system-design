import React, { useEffect, useState } from 'react';
import { getEvent, bookTickets } from '../api';

function EventDetail({ eventId, onBooked }) {
  const [event, setEvent] = useState(null);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getEvent(eventId).then(res => {
      setEvent(res.data);
      setLoading(false);
    });
  }, [eventId]);

  const handleSelect = (ticketId) => {
    setSelected(sel => sel.includes(ticketId) ? sel.filter(id => id !== ticketId) : [...sel, ticketId]);
  };

  const handleBook = async () => {
    setBooking(true);
    setError('');
    try {
      const res = await bookTickets(eventId, { ticketIds: selected, userId: 'demo-user', paymentToken: 'demo' });
      onBooked(res.data.bookingId);
    } catch (e) {
      setError(e.response?.data?.error || 'Booking failed');
    }
    setBooking(false);
  };

  if (loading) return <div>Loading event...</div>;
  if (!event) return <div>Event not found</div>;

  return (
    <div>
      <h2>{event.name}</h2>
      <div>{event.description}</div>
      <div>Venue: {event.Venue?.name}</div>
      <div>Date: {new Date(event.date).toLocaleString()}</div>
      <h3>Seat Map</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: 600 }}>
        {event.Tickets?.map(ticket => (
          <button
            key={ticket.id}
            style={{
              margin: 4,
              background: selected.includes(ticket.id)
                ? 'orange'
                : ticket.status === 'available'
                ? 'lightgreen'
                : ticket.status === 'reserved'
                ? 'yellow'
                : 'lightgray',
              cursor: ticket.status === 'available' ? 'pointer' : 'not-allowed',
            }}
            disabled={ticket.status !== 'available'}
            onClick={() => handleSelect(ticket.id)}
          >
            {ticket.seatSection}-{ticket.seatRow}-{ticket.seatNumber}
            <br />${ticket.price}
          </button>
        ))}
      </div>
      <button onClick={handleBook} disabled={booking || selected.length === 0}>Book Selected</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}

export default EventDetail;
