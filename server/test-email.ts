import sendEmail from './src/services/emailService.js'

async function testEmail() {
  try {
    console.log('Testing email service...')
    
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email from GE-Metrics',
      text: 'This is a test email to verify our email service is working.',
      html: '<h1>Test Email</h1><p>This is a test email to verify our email service is working.</p>'
    })
    
    console.log('Email test result:', result)
    
    if (result.success) {
      console.log('✅ Email service is configured correctly')
    } else {
      console.log('❌ Email service configuration issue:', result.error)
    }
  } catch (error) {
    console.error('Email test failed:', error)
  }
}

testEmail().then(() => {
  console.log('Email test completed')
  process.exit(0)
}).catch(error => {
  console.error('Email test error:', error)
  process.exit(1)
})