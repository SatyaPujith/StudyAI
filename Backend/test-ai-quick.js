import dotenv from 'dotenv';
dotenv.config();

import aiService from './src/services/aiService.js';

async function testAI() {
    console.log('🧪 Testing AI Service...');
    
    try {
        const result = await aiService.generateQuizQuestions('JavaScript', 'beginner', 3);
        console.log('✅ Quiz Result:', result);
        
        const studyPlan = await aiService.generateDetailedStudyPlan('React', 'beginner', '3 days', 'visual');
        console.log('✅ Study Plan Result:', studyPlan);
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

testAI();