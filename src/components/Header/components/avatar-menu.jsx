import { Avatar, Menu } from '@mantine/core'
import { IconLogout2, IconReceipt, IconTool, IconUserCircle, IconVip } from '@tabler/icons-react'
import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../../../utils/firebase/auth-context.jsx'
import { handleLogout } from '../../../utils/firebase/firebase-methods.jsx'

export default function TableSettingsMenu () {
  const { user } = useContext(AuthContext)

  return (
        <Menu shadow="md" width={200}>
            {/* <Menu.Target>
                <Avatar src={null} alt={user.uid} color="primary">{user.email.split('')[0].toUpperCase()}</Avatar>
            </Menu.Target> */}

            <Menu.Dropdown sx={{ zIndex: 20 }}>
                <Menu.Label>Account Settings</Menu.Label>
                <Menu.Item icon={<IconVip size={14}/>}>Upgrade to Premium</Menu.Item>
                {/* <Link to={`/profile/${user.uid}`} style={{ textDecoration: 'none' }}>
                    <Menu.Item icon={<IconUserCircle size={14}/>}>My Profile</Menu.Item>
                </Link> */}
                <Menu.Item icon={<IconTool size={14}/>}>Account Settings</Menu.Item>
                <Menu.Divider/>
                <Menu.Label>Purchase Options</Menu.Label>
                <Menu.Item icon={<IconReceipt size={14}/>}>My Profile</Menu.Item>
                <Menu.Divider/>
                {/* <Menu.Label>Danger zone</Menu.Label> */}
                <Menu.Item icon={<IconLogout2 size={14}/>} onClick={handleLogout}>Logout</Menu.Item>
            </Menu.Dropdown>
        </Menu>
  )
}
