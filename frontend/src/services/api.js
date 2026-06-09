import axios from 'axios';
import { getApiBase } from '@/lib/env';

function apiBase() {
  return getApiBase();
}

export const api = {
  async getCourses(limit = 50) {
    const res = await axios.get(`${apiBase()}/courses`, { params: { limit } });
    return res.data;
  },

  async getAllCourses() {
    const res = await axios.get(`${apiBase()}/courses`, { params: { limit: 9999 } });
    return res.data;
  },

  async getMyCourses(token) {
    const res = await axios.get(`${apiBase()}/courses/my-courses`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    return res.data;
  },

  
  async getRecommendations(userId, topN = 10, alpha = 0.5) {
    const res = await axios.get(`${apiBase()}/recommend/${userId}`, { params: { top_n: topN, alpha } });
    return res.data;
  },

  async getDynamicRecommendations(selectedCourses, topN = 10, alpha = 0.5) {
    const res = await axios.post(`${apiBase()}/recommend/dynamic`, { selected_courses: selectedCourses, top_n: topN, alpha });
    return res.data;
  },
  
  async getExplanation(userId, courseId, alpha = 0.5) {
    const res = await axios.get(`${apiBase()}/explain/${userId}/${courseId}`, { params: { alpha } });
    return res.data;
  },

  async getDynamicExplanation(selectedCourses, courseId, alpha = 0.5) {
    const res = await axios.post(`${apiBase()}/explain/dynamic`, { selected_courses: selectedCourses, course_id: courseId, alpha });
    return res.data;
  },

  async getLlmDynamicExplanation(selectedCourses, courseId, alpha = 0.5) {
    const res = await axios.post(`${apiBase()}/llm-explain/dynamic`, { selected_courses: selectedCourses, course_id: courseId, alpha });
    return res.data; // { course_id, title, llm_explanation }
  },

  /**
   * Skill-based onboarding: maps selected skill tags to courses internally,
   * runs the hybrid model, and returns recommendations + extra discovered skills.
   */
  async getSkillRecommendations(selectedSkills, topN = 10, alpha = 0.5) {
    const res = await axios.post(`${apiBase()}/profile/skills-to-courses`, {
      selected_skills: selectedSkills,
      top_n: topN,
      alpha,
    });
    return res.data; // { recommendations: [...], extra_skills: [...] }
  },

  /**
   * Saves the student profile (education level, year, interest text, skills)
   * to Supabase for future analytics.
   */
  async saveProfile(token, profileData) {
    const res = await axios.post(`${apiBase()}/profile/save-profile`, profileData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async saveMyCourses(token, courseIds) {
    const res = await axios.post(`${apiBase()}/courses/my-courses`, {
      selected_courses: courseIds
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  async signup(email, password) {
    const res = await axios.post(`${apiBase()}/auth/signup`, { email, password });
    return res.data;
  },

  async mentorChat(messages, yearOfStudy) {
    const res = await axios.post(`${apiBase()}/mentor/chat`, {
      messages,
      year_of_study: yearOfStudy,
    });
    return res.data;
  },
};
