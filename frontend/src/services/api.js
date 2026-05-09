import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export const api = {
  async getCourses(limit = 50) {
    const res = await axios.get(`${API_BASE}/courses`, { params: { limit } });
    return res.data;
  },

  async getAllCourses() {
    const res = await axios.get(`${API_BASE}/courses`, { params: { limit: 9999 } });
    return res.data;
  },

  async getMyCourses(token) {
    const res = await axios.get(`${API_BASE}/courses/my-courses`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    return res.data;
  },

  
  async getRecommendations(userId, topN = 10, alpha = 0.5) {
    const res = await axios.get(`${API_BASE}/recommend/${userId}`, { params: { top_n: topN, alpha } });
    return res.data;
  },

  async getDynamicRecommendations(selectedCourses, topN = 10, alpha = 0.5) {
    const res = await axios.post(`${API_BASE}/recommend/dynamic`, { selected_courses: selectedCourses, top_n: topN, alpha });
    return res.data;
  },
  
  async getExplanation(userId, courseId, alpha = 0.5) {
    const res = await axios.get(`${API_BASE}/explain/${userId}/${courseId}`, { params: { alpha } });
    return res.data;
  },

  async getDynamicExplanation(selectedCourses, courseId, alpha = 0.5) {
    const res = await axios.post(`${API_BASE}/explain/dynamic`, { selected_courses: selectedCourses, course_id: courseId, alpha });
    return res.data;
  },

  /**
   * Skill-based onboarding: maps selected skill tags to courses internally,
   * runs the hybrid model, and returns recommendations + extra discovered skills.
   */
  async getSkillRecommendations(selectedSkills, topN = 10, alpha = 0.5) {
    const res = await axios.post(`${API_BASE}/profile/skills-to-courses`, {
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
    const res = await axios.post(`${API_BASE}/profile/save-profile`, profileData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
};
