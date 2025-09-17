import React from "react";

export default function TicketCard({ ticket, onView, onResolve, section }) {
  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <h3 className="font-bold text-lg">{ticket.title}</h3>
      <p className="text-gray-600 mb-2">{ticket.description}</p>
      <p className="text-sm text-gray-500">
        Priority: {ticket.priority} | Category: {ticket.category}
      </p>
      {section === "New Requests" && (
        <button
          onClick={() => onView(ticket.id)}
          className="mt-2 bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
        >
          View
        </button>
      )}
      {section === "Unresolved" && (
        <button
          onClick={() => onResolve(ticket.id)}
          className="mt-2 bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
        >
          Resolve
        </button>
      )}
    </div>
  );
}
