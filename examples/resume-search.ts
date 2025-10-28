/**
 * Resume Search Example
 *
 * Demonstrates multi-vector weighted search for candidate/resume matching.
 * Based on production-tested code from real-world recruiting system.
 *
 * This example shows how to:
 * 1. Structure resume data into searchable sections
 * 2. Generate embeddings for each section (experience, skills, education)
 * 3. Insert resumes with multi-vector embeddings
 * 4. Perform weighted search prioritizing experience
 *
 * Author: Ravindra Kanchikare (krhebbar)
 * License: MIT
 */

import {
  createVectorSearchClient,
  createOpenAIProvider,
  generateDocumentEmbeddings,
  DocumentSections,
} from '../src';

/**
 * Resume data structure (simplified)
 */
interface Resume {
  basics: {
    name: string;
    email: string;
    currentCompany?: string;
    currentJobTitle?: string;
    location?: string;
  };
  positions: Array<{
    title: string;
    org: string;
    summary: string;
    location?: string;
    startDate?: string;
    endDate?: string;
  }>;
  schools: Array<{
    institution: string;
    degree: string;
    field: string;
    gpa?: string;
  }>;
  skills: string[];
  certificates?: string[];
  languages?: string[];
}

/**
 * Convert resume JSON to text sections for embedding
 *
 * This function mirrors the production logic from embedding.ts
 */
function convertResumeToSections(resume: Resume): DocumentSections {
  // Build experience text
  const experience = resume.positions
    .map((pos) => {
      return `${pos.title || ''} ${pos.org || ''} ${pos.summary || ''} ${
        pos.location && pos.location !== 'N/A' ? pos.location : ''
      }`.trim();
    })
    .join(' ');

  // Build education text
  const education = resume.schools
    .map((school) => {
      return `${school.institution || ''} ${school.degree || ''} ${
        school.field || ''
      } ${school.gpa || ''}`.trim();
    })
    .join(' ');

  // Build skills text
  const skills = resume.skills.join(' ');

  // Build basics text
  const basics = `${resume.basics.currentCompany || ''} ${
    resume.basics.currentJobTitle || ''
  } ${resume.basics.location || ''}`.trim();

  // Build certificates text
  const certificates = resume.certificates ? resume.certificates.join(' ') : '';

  // Build languages text
  const languages = resume.languages ? resume.languages.join(' ') : '';

  // Combine everything for full resume embedding
  const fullResume = [
    basics,
    experience,
    education,
    skills,
    certificates,
    languages,
  ]
    .filter((text) => text.length > 0)
    .join(' ');

  return {
    main: fullResume, // Full resume context
    section_1: education, // Education embedding
    section_2: experience, // Experience embedding (most important)
    section_3: skills, // Skills embedding
  };
}

/**
 * Main example function
 */
async function main() {
  // Initialize embedding provider
  const provider = createOpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'text-embedding-ada-002',
  });

  // Initialize vector search client
  const client = createVectorSearchClient({
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_KEY!,
  });

  console.log('🚀 Resume Search Example\n');

  // Example resume data
  const candidateResume: Resume = {
    basics: {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      currentCompany: 'Tech Corp',
      currentJobTitle: 'Senior Software Engineer',
      location: 'San Francisco, CA',
    },
    positions: [
      {
        title: 'Senior Software Engineer',
        org: 'Tech Corp',
        summary:
          'Led development of microservices architecture using TypeScript, Node.js, and PostgreSQL. Implemented vector search for product recommendations.',
        location: 'San Francisco, CA',
        startDate: '2021-01',
        endDate: 'Present',
      },
      {
        title: 'Software Engineer',
        org: 'Startup Inc',
        summary:
          'Built RESTful APIs with Python and FastAPI. Designed database schemas and optimized query performance.',
        location: 'Remote',
        startDate: '2019-06',
        endDate: '2021-01',
      },
    ],
    schools: [
      {
        institution: 'Stanford University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        gpa: '3.8',
      },
    ],
    skills: [
      'TypeScript',
      'Node.js',
      'PostgreSQL',
      'Python',
      'FastAPI',
      'Vector Search',
      'Microservices',
      'REST APIs',
    ],
    certificates: ['AWS Certified Solutions Architect'],
    languages: ['English', 'Spanish'],
  };

  // Step 1: Convert resume to sections
  console.log('📋 Converting resume to searchable sections...');
  const sections = convertResumeToSections(candidateResume);
  console.log(`   - Full resume: ${sections.main.substring(0, 100)}...`);
  console.log(`   - Education: ${sections.section_1?.substring(0, 60)}...`);
  console.log(`   - Experience: ${sections.section_2?.substring(0, 60)}...`);
  console.log(`   - Skills: ${sections.section_3?.substring(0, 60)}...\n`);

  // Step 2: Generate embeddings for all sections
  console.log('🔄 Generating embeddings with OpenAI...');
  const embeddings = await generateDocumentEmbeddings(sections, provider);
  console.log('   ✓ Generated 4 embeddings (resume, education, experience, skills)\n');

  // Step 3: Insert resume into database
  console.log('💾 Inserting resume into Supabase...');
  const insertedDoc = await client.insertDocument({
    content: sections.main,
    embedding: embeddings.embedding!,
    embedding_section_1: embeddings.embedding_section_1!,
    embedding_section_2: embeddings.embedding_section_2!,
    embedding_section_3: embeddings.embedding_section_3!,
    metadata: {
      candidate_name: candidateResume.basics.name,
      candidate_email: candidateResume.basics.email,
      current_company: candidateResume.basics.currentCompany,
      current_title: candidateResume.basics.currentJobTitle,
      location: candidateResume.basics.location,
      type: 'resume',
    },
  });
  console.log(`   ✓ Inserted resume with ID: ${insertedDoc.id}\n`);

  // Step 4: Search for candidates matching a job description
  console.log('🔍 Searching for candidates matching job description...\n');

  const jobDescription = `
    Senior Backend Engineer position at fast-growing SaaS company.

    We're looking for an experienced backend engineer with strong TypeScript and Node.js skills.
    The ideal candidate has experience building microservices, working with PostgreSQL,
    and implementing advanced features like vector search or recommendation engines.

    Requirements:
    - 3+ years backend development experience
    - Strong TypeScript/Node.js skills
    - PostgreSQL and database optimization
    - Microservices architecture
    - Experience with modern API design
  `;

  // Generate query embeddings for job description
  console.log('   Generating query embeddings...');
  const queryEmbeddings = await generateDocumentEmbeddings(
    {
      main: jobDescription,
      section_1: '', // No education requirement
      section_2: jobDescription, // Focus on experience requirements
      section_3: 'TypeScript Node.js PostgreSQL Microservices APIs', // Key skills
    },
    provider
  );

  // Perform weighted search
  // Weight distribution: 50% experience, 20% skills, 20% resume, 10% education
  console.log('   Performing weighted search (50% exp, 20% skills, 20% resume, 10% edu)...\n');
  const results = await client.searchWeighted({
    queryEmbedding: queryEmbeddings.embedding!,
    querySection1: queryEmbeddings.embedding_section_1!, // Education
    querySection2: queryEmbeddings.embedding_section_2!, // Experience
    querySection3: queryEmbeddings.embedding_section_3!, // Skills
    weightMain: 0.2, // 20% full resume match
    weightSection1: 0.1, // 10% education match
    weightSection2: 0.5, // 50% experience match (most important!)
    weightSection3: 0.2, // 20% skills match
    matchThreshold: 0.5,
    matchCount: 10,
  });

  // Display results
  console.log(`📊 Found ${results.length} matching candidates:\n`);
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.metadata?.candidate_name || 'Unknown'}`);
    console.log(`   Overall Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    console.log(`   - Experience Match: ${((result.similarity_section_2 || 0) * 100).toFixed(1)}%`);
    console.log(`   - Skills Match: ${((result.similarity_section_3 || 0) * 100).toFixed(1)}%`);
    console.log(`   - Education Match: ${((result.similarity_section_1 || 0) * 100).toFixed(1)}%`);
    console.log(`   Current Role: ${result.metadata?.current_title || 'N/A'} at ${result.metadata?.current_company || 'N/A'}`);
    console.log('');
  });

  // Clean up (optional): Delete the test resume
  console.log('🧹 Cleaning up test data...');
  await client.deleteDocument(insertedDoc.id!);
  console.log('   ✓ Test resume deleted\n');

  console.log('✅ Example complete!');
}

// Run the example
if (require.main === module) {
  main().catch((error) => {
    console.error('Error running example:', error);
    process.exit(1);
  });
}

export { main, convertResumeToSections };
