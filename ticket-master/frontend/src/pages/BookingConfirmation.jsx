import React from 'react';

function BookingConfirmation({ bookingId, onBack }) {
  return (
    <div>
      <h2>Booking Confirmed!</h2>
      <div>Your booking ID: {bookingId}</div>
      <button onClick={onBack}>Back to Search</button>
    </div>
  );
}

export default BookingConfirmation;
