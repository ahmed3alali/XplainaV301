import axios from 'axios';
import { getApiBase } from '@/lib/env';

const client = axios.create({ withCredentials: true });

function apiBase() {
  return getApiBase();
}

export const api = {
  async getCourses(limit = 50) {
    const res = await client.get(`${apiBase()}/courses`, { params: { limit } });
    return res.data;
  },

  async getAllCourses() {
    const res = await client.get(`${apiBase()}/courses`, { params: { limit: 9999 } });
    return res.data;
  },

  async getMyCourses() {
    const res = await client.get(`${apiBase()}/courses/my-courses`);
    return res.data;
  },

  async getRecommendations(userId, topN = 10, alpha = 0.5) {
    const res = await client.get(`${apiBase()}/recommend/${userId}`, { params: { top_n: topN, alpha } });
    return res.data;
  },

  async getDynamicRecommendations(selectedCourses, topN = 10, alpha = 0.5) {
    const res = await client.post(`${apiBase()}/recommend/dynamic`, { selected_courses: selectedCourses, top_n: topN, alpha });
    return res.data;
  },

  async getExplanation(userId, courseId, alpha = 0.5) {
    const res = await client.get(`${apiBase()}/explain/${userId}/${courseId}`, { params: { alpha } });
    return res.data;
  },

  async getDynamicExplanation(selectedCourses, courseId, alpha = 0.5) {
    const res = await client.post(`${apiBase()}/explain/dynamic`, { selected_courses: selectedCourses, course_id: courseId, alpha });
    return res.data;
  },

  async getLlmDynamicExplanation(selectedCourses, courseId, alpha = 0.5) {
    const res = await client.post(`${apiBase()}/llm-explain/dynamic`, { selected_courses: selectedCourses, course_id: courseId, alpha });
    return res.data;
  },

  async getSkillRecommendations(selectedSkills, topN = 10, alpha = 0.5) {
    const res = await client.post(`${apiBase()}/profile/skills-to-courses`, {
      selected_skills: selectedSkills,
      top_n: topN,
      alpha,
    });
    return res.data;
  },

  async saveProfile(profileData) {
    const res = await client.post(`${apiBase()}/profile/save-profile`, profileData);
    return res.data;
  },

  async saveMyCourses(courseIds) {
    const res = await client.post(`${apiBase()}/courses/my-courses`, {
      selected_courses: courseIds,
    });
    return res.data;
  },

  async signup(email, password) {
    const res = await client.post(`${apiBase()}/auth/signup`, { email, password });
    return res.data;
  },

  async mentorChat(messages, yearOfStudy) {
    const res = await client.post(`${apiBase()}/mentor/chat`, {
      messages,
      year_of_study: yearOfStudy,
    });
    return res.data;
  },
};
