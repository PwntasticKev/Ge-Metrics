import React, { useState } from 'react'
import { Button, Container, Flex, Input } from '@mantine/core'

export default function ProfitCalculator () {
  const [inputValue, setInputValue] = useState('')

  const handleButtonClick = (value) => {
    setInputValue(prev => prev + value)
  }

  const handleClear = () => {
    setInputValue('')
  }

  const handleConvertToThousands = () => {
    const parsedValue = parseFloat(inputValue.replace(/,/g, ''))
    if (!isNaN(parsedValue)) {
      setInputValue((parsedValue * 1000).toLocaleString())
    }
  }

  const handleConvertToMillions = () => {
    const parsedValue = parseFloat(inputValue.replace(/,/g, ''))
    if (!isNaN(parsedValue)) {
      setInputValue((parsedValue * 1000000).toLocaleString())
    }
  }

  const handleEnter = () => {
    // Here, you can implement the logic to submit the value or perform calculations
  }

  const formattedInputValue = inputValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return (
        <Container size="xs" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 2 }}>
                <Button onClick={handleClear}>Clear</Button>
            </div>

            <Input
                readOnly
                value={formattedInputValue}
                style={{ letterSpacing: '2px', paddingRight: '40px', textAlign: 'right' }}
            />

            <Flex gutter="sm" style={{ marginTop: '8px' }} justify="space-between">
                {/* Buttons for row 1 */}
                {[1, 2, 3].map((value, index) => (
                    <div span={3} key={index}>
                        <Button size="lg"
                                onClick={() => handleButtonClick(value)}>{value}</Button>
                    </div>
                ))}
                <div span={3}>
                    <Button size="lg" onClick={handleConvertToThousands}>K</Button>
                </div>
            </Flex>

            <Flex gutter="sm" justify="space-between">
                {/* Buttons for row 2 */}
                {[4, 5, 6].map((value, index) => (
                    <div span={3} key={index}>
                        <Button size="lg" onClick={() => handleButtonClick(value)}>{value}</Button>
                    </div>
                ))}
                <div span={3}>
                    <Button size="lg" onClick={handleConvertToMillions}>M</Button>
                </div>
            </Flex>

            <Flex gutter="sm" justify="space-between">
                {/* Buttons for row 3 */}
                {[7, 8, 9, 0].map((value, index) => (
                    <div span={3} key={index}>
                        <Button size="lg" onClick={() => handleButtonClick(value)}>{value}</Button>
                    </div>
                ))}
            </Flex>

            <Flex gutter="sm" style={{ marginTop: '8px' }}>
                {/* Button for Enter */}
                <div span={6}>
                    <Button size="lg" onClick={handleEnter}>Enter</Button>
                </div>
            </Flex>
        </Container>
  )
}
