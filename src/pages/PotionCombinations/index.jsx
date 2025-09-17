import React from 'react'
import { Container, Title, SimpleGrid, Loader, Center } from '@mantine/core'
import { PotionCard } from './PotionCard'
import { usePotionRecipes } from '../../utils/potion-recipes'
import { CalculationExplainer } from './CalculationExplainer'

export default function PotionCombinations () {
  const { recipes, isLoading, error } = usePotionRecipes()

  console.log('PotionCombinations component - recipes:', recipes.length, recipes.map(r => r.name))
  console.log('Full recipes data:', recipes)

  if (isLoading) {
    return (
      <Center style={{ height: '80vh' }}>
        <Loader size="xl" />
      </Center>
    )
  }

  if (error) {
    return (
      <Container>
        <Title order={2} align="center" mt="lg" color="red">
          Error loading potion recipes
        </Title>
      </Container>
    )
  }

  return (
    <Container size="xl">
      <Title order={1} align="center" my="xl">
        Potion Combination Profits
      </Title>
      <CalculationExplainer />
      <SimpleGrid
        cols={4}
        spacing="xl"
        breakpoints={[
          { maxWidth: 'md', cols: 3, spacing: 'md' },
          { maxWidth: 'sm', cols: 2, spacing: 'sm' },
          { maxWidth: 'xs', cols: 1, spacing: 'sm' }
        ]}
      >
        {recipes.map(recipe => (
          <PotionCard key={recipe.name} recipe={recipe} />
        ))}
      </SimpleGrid>
    </Container>
  )
}
