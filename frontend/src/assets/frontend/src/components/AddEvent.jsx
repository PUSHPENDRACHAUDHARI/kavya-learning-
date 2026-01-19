import React, { useState } from "react";
import "../assets/AddEvent.css";

export default function AddEvent({ open = true, onClose }) {
  // simple local form state (not required, but helpful)
  const [form, setForm] = useState({
    title: "",
    instructor: "",
    type: "Live Class",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    maxStudents: 30,
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    // For now, just log the form. Replace with API call as needed.
    console.log("Add Event:", form);
    if (onClose) onClose();
  }

  if (!open) return null;

  return (
    <div className="ae-overlay" onClick={onClose ? onClose : undefined}>
      <div className="ae-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ae-header">
          <h2>Add New Event</h2>
          <button className="ae-close" onClick={onClose || undefined}>
            ×
          </button>
        </div>

        <form className="ae-form" onSubmit={handleSubmit}>
          <div className="ae-group full">
            <label>Event Title</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g., Advanced Mathematics"
            />
          </div>

          <div className="ae-row">
            <div className="ae-group">
              <label>Instructor</label>
              <input
                name="instructor"
                value={form.instructor}
                onChange={handleChange}
                placeholder="e.g., Dr. Sarah Smith"
              />
            </div>

            <div className="ae-group">
              <label>Event Type</label>
              <select name="type" value={form.type} onChange={handleChange}>
                <option>Live Class</option>
                <option>Webinar</option>
                <option>Workshop</option>
              </select>
            </div>
          </div>

          <div className="ae-row">
            <div className="ae-group">
              <label>Date</label>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
              />
            </div>

            <div className="ae-group">
              <label>Start Time</label>
              <input
                name="startTime"
                type="time"
                value={form.startTime}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="ae-row">
            <div className="ae-group">
              <label>End Time</label>
              <input
                name="endTime"
                type="time"
                value={form.endTime}
                onChange={handleChange}
              />
            </div>

            <div className="ae-group">
              <label>Location</label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g., Virtual Room 1"
              />
            </div>
          </div>

          <div className="ae-group full">
            <label>Max Students</label>
            <input
              name="maxStudents"
              type="number"
              min="1"
              value={form.maxStudents}
              onChange={handleChange}
            />
          </div>

          <div className="ae-actions">
            <button
              type="button"
              className="ae-cancel"
              onClick={onClose || undefined}
            >
              Cancel
            </button>
            <button type="submit" className="ae-add">
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
