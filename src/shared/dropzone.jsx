import { useState } from 'react'
import { Group, rem, Text, useMantineTheme } from '@mantine/core'
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react'
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone'

export default function DropZone (props) {
  const theme = useMantineTheme()
  const [file, setFile] = useState(null)

  const handleDrop = (files) => {
    if (files.length > 0) {
      setFile(files[0])
    }
  }

  const handleRemove = () => {
    setFile(null)
  }

  return (
        <Dropzone
            onDrop={handleDrop}
            onReject={(files) => console.log('rejected files', files)}
            maxSize={3 * 1024 ** 2}
            accept={IMAGE_MIME_TYPE}
            {...props}
        >
            <Group position="center" spacing="xl" style={{ minHeight: rem(220), pointerEvents: 'none' }}>
                {file
                  ? (
                    <div style={{ position: 'relative' }}>
                        <img src={URL.createObjectURL(file)} alt="Uploaded" style={{ maxWidth: '100%', height: 'auto' }}/>
                        <button
                            onClick={handleRemove}
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0
                            }}
                        >
                            <IconX size="1.6rem" stroke={1.5} color="red"/>
                        </button>
                    </div>
                    )
                  : (
                    <>
                        <Dropzone.Accept>
                            <IconUpload
                                size="3.2rem"
                                stroke={1.5}
                                color={theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 4 : 6]}
                            />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                            <IconX
                                size="3.2rem"
                                stroke={1.5}
                                color={theme.colors.red[theme.colorScheme === 'dark' ? 4 : 6]}
                            />
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                            <IconPhoto size="3.2rem" stroke={1.5}/>
                        </Dropzone.Idle>
                        <div>
                            <Text size="xl" inline>
                                Drag images here or click to select files
                            </Text>
                            <Text size="sm" color="dimmed" inline mt={7}>
                                Attach as many files as you like, each file should not exceed 5mb
                            </Text>
                        </div>
                    </>
                    )}
            </Group>
        </Dropzone>
  )
}
