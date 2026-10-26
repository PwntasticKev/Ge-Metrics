Pod::Spec.new do |s|
  s.name           = 'PipTicker'
  s.version        = '1.0.0'
  s.summary        = 'GE Metrics price ticker in a Picture in Picture window'
  s.description    = 'Renders a live price ticker into an AVSampleBufferDisplayLayer and shows it with AVPictureInPictureController.'
  s.author         = 'GE Metrics'
  s.homepage       = 'https://ge-metrics.com'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVKit', 'AVFoundation', 'CoreMedia', 'CoreVideo', 'CoreImage'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
