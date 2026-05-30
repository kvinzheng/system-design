import React, { useState } from 'react';
import EventSearch from './pages/EventSearch';
import EventDetail from './pages/EventDetail';
import BookingConfirmation from './pages/BookingConfirmation';

function App() {
  const [eventId, setEventId] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  if (bookingId) {
    return <BookingConfirmation bookingId={bookingId} onBack={() => { setBookingId(null); setEventId(null); }} />;
  }
  if (eventId) {
    return <EventDetail eventId={eventId} onBooked={setBookingId} />;
  }
  return <EventSearch onSelect={setEventId} />;
}

export default App;
