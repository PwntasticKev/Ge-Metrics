import React, { useState } from 'react'
import {
  Box,
  Card,
  Text,
  Button,
  Group,
  Table,
  Badge,
  ActionIcon,
  Select,
  Stack,
  Title,
  Alert,
  Tabs,
  Modal,
  TextInput,
  Textarea
  , Loader, Paper
} from '@mantine/core'
import {
  IconCheck,
  IconX,
  IconUser,
  IconUsers,
  IconSettings,
  IconMail,
  IconClock,
  IconShield,
  IconAlertCircle,
  IconCreditCard,
  IconMathSymbols
} from '@tabler/icons-react'
import accessControlService from '../../services/accessControlService.js'
import { useNavigate } from 'react-router-dom'
import { trpc } from '../../utils/trpc'

const AdminPage = () => {
  const { data: users, isLoading, error } = trpc.admin.getAllUsers.useQuery()

  return (
    <div>
      <Title order={1}>Admin Dashboard</Title>
      <Text>Welcome to the admin panel. Here you can manage users, view system settings, and more.</Text>

      <Paper withBorder shadow="md" p="md" mt="xl">
        <Title order={3}>User Management</Title>
        {isLoading && <Loader />}
        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error!" color="red" mt="md">
            {error.message}
          </Alert>
        )}
        {users && (
          <Table mt="md" striped highlightOnHover withBorder>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Username</th>
                <th>Verified</th>
                <th>Joined On</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.username}</td>
                  <td>{user.emailVerified ? 'Yes' : 'No'}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Paper>
    </div>
  )
}

export default AdminPage
