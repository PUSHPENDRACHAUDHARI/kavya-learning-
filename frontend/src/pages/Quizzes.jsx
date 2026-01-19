import React, { useEffect, useState } from 'react';
import api from '../api';

function Quizzes() {
  const [courses, setCourses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', questions: '' });

  useEffect(() => {
    (async () => {
      const c = await api.getCourses();
      if (c && c.courses) setCourses(c.courses);
    })();
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    (async () => {
      const q = await api.getQuizzes(selectedCourse);
      if (q) setQuizzes(q);
    })();
  }, [selectedCourse]);

  function parseQuestions(text) {
    // Very simple format: one question per line, options after |, correct index after #
    // Example: What is 2+2?|2,3,4,5#2
    if (!text) return [];
    return text.split('\n').map(line => {
      const [qpart] = line.split('\n');
      const [left, right] = line.split('|');
      const [optionsPart, correctPart] = (right || '').split('#');
      return {
        question: left || '',
        options: optionsPart ? optionsPart.split(',').map(s => s.trim()) : [],
        correctAnswer: correctPart ? optionsPart.split(',')[Number(correctPart)] : null
      };
    });
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    const payload = {
      courseId: selectedCourse,
      title: form.title,
      description: form.description,
      questions: parseQuestions(form.questions),
      passingScore: 60,
      timeLimit: 30
    };
    const res = await api.createQuiz(payload);
    console.log('create quiz res', res);
    setCreating(false);
    if (res._id) {
      alert('Quiz created');
      const list = await api.getQuizzes(selectedCourse);
      setQuizzes(list);
    } else {
      alert(res.message || 'Failed to create');
    }
  };

  const handleAttempt = async (quiz) => {
    // Simple auto-attempt: pick first option for each question
    const answers = quiz.questions.map(q => ({ questionId: q._id || q.questionId, selectedOption: q.options && q.options[0] }));
    const res = await api.submitQuiz(quiz._id, answers);
    alert(`Score: ${res.score} - ${res.passed ? 'Passed' : 'Failed'}`);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Quizzes</h2>

      <div>
        <label>Select Course: </label>
        <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
          <option value="">--select--</option>
          {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
        </select>
      </div>

      {selectedCourse && (
        <div style={{ marginTop: 16 }}>
          <h3>Create Quiz</h3>
          <form onSubmit={handleCreate}>
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <br />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <br />
            <textarea placeholder={'Questions (one per line, format: Question?|opt1,opt2,opt3#correctIndex)'} value={form.questions} onChange={e => setForm({ ...form, questions: e.target.value })} rows={6} />
            <br />
            <button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Quiz'}</button>
          </form>

          <h3 style={{ marginTop: 20 }}>Available Quizzes</h3>
          <ul>
            {Array.isArray(quizzes) && quizzes.map(q => (
              <li key={q._id} style={{ marginBottom: 8 }}>
                <strong>{q.title}</strong> — {q.description}
                <div><button onClick={() => handleAttempt(q)}>Attempt (auto)</button></div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Quizzes;
