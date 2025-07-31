/**
 * Test para verificar que el parser de tiempo funciona correctamente
 */

// Copiamos la función timeStringToSeconds para testing
const timeStringToSeconds = (time: string): number => {
  try {
    console.log(`🔍 Parsing time: "${time}"`);
    
    // Formato esperado: MM:SS.mmm
    if (time.includes('.')) {
      // Formato MM:SS.mmm (recomendado)
      const [timePart, millisecondsPart] = time.split('.');
      const [minutes, seconds] = timePart.split(':').map(part => parseInt(part, 10));
      const milliseconds = parseInt(millisecondsPart.padEnd(3, '0').substring(0, 3), 10);
      
      const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
      
      console.log(`✅ Parsed MM:SS.mmm: ${time} = ${minutes}m ${seconds}s ${milliseconds}ms = ${totalSeconds}s`);
      return totalSeconds;
    }
    
    // Formato legacy: MM:SS:mmm (para compatibilidad)
    const parts = time.split(':');
    
    if (parts.length === 3) {
      const firstPart = parseInt(parts[0], 10);
      const secondPart = parseInt(parts[1], 10);
      const thirdPart = parseInt(parts[2], 10);
      
      // Detectar si es MM:SS:mmm o HH:MM:SS
      if (firstPart < 60 && secondPart < 60 && thirdPart >= 100) {
        // Formato MM:SS:mmm (minutos:segundos:milisegundos)
        const minutes = firstPart;
        const seconds = secondPart;
        const milliseconds = thirdPart;
        
        const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
        
        console.log(`⚠️ Legacy MM:SS:mmm: ${time} = ${minutes}m ${seconds}s ${milliseconds}ms = ${totalSeconds}s`);
        return totalSeconds;
      } else {
        // Formato HH:MM:SS
        const hours = firstPart;
        const minutes = secondPart;
        const seconds = thirdPart;
        
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        
        console.log(`⚠️ Legacy HH:MM:SS: ${time} = ${hours}h ${minutes}m ${seconds}s = ${totalSeconds}s`);
        return totalSeconds;
      }
    } else if (parts.length === 2) {
      // Formato MM:SS
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      
      const totalSeconds = minutes * 60 + seconds;
      
      console.log(`⚠️ Legacy MM:SS: ${time} = ${minutes}m ${seconds}s = ${totalSeconds}s`);
      return totalSeconds;
    } else {
      console.warn(`❌ Unknown time format: ${time}`);
      return parseFloat(time) || 0;
    }
  } catch (error) {
    console.error('❌ Error parsing time string:', time, error);
    return 0;
  }
};

/**
 * Test cases para verificar el parser
 */
function testTimeParser() {
  console.log('🧪 Testing time parser...\n');
  
  const testCases = [
    // Formato correcto esperado
    { input: '00:00.000', expected: 0, description: 'Start of chunk' },
    { input: '00:05.500', expected: 5.5, description: '5.5 seconds' },
    { input: '01:30.250', expected: 90.25, description: '1 minute 30.25 seconds' },
    { input: '02:15.750', expected: 135.75, description: '2 minutes 15.75 seconds' },
    
    // Formatos problemáticos del error original
    { input: '00:01:300', expected: 1.3, description: 'Legacy MM:SS:mmm format' },
    { input: '00:02:460', expected: 2.46, description: 'Legacy MM:SS:mmm format' },
    { input: '00:13:830', expected: 13.83, description: 'Legacy MM:SS:mmm format' },
    
    // Formatos edge case
    { input: '00:00:000', expected: 0, description: 'Legacy start time' },
    { input: '01:40:950', expected: 100.95, description: 'Legacy 1m 40.95s' },
    
    // Formatos simples
    { input: '00:30', expected: 30, description: 'Simple MM:SS format' },
    { input: '02:15', expected: 135, description: 'Simple MM:SS format' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`\n--- Test ${index + 1}: ${testCase.description} ---`);
    const result = timeStringToSeconds(testCase.input);
    const isCorrect = Math.abs(result - testCase.expected) < 0.001; // Allow small floating point differences
    
    if (isCorrect) {
      console.log(`✅ PASS: "${testCase.input}" → ${result}s (expected ${testCase.expected}s)`);
      passed++;
    } else {
      console.log(`❌ FAIL: "${testCase.input}" → ${result}s (expected ${testCase.expected}s)`);
      failed++;
    }
  });
  
  console.log(`\n🎯 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Parser needs adjustment.');
  }
}

// Run tests if called directly
if (require.main === module) {
  testTimeParser();
}

export { testTimeParser };