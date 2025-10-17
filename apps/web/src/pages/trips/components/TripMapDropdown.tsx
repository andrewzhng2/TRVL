import { ActionIcon, Popover } from '@mantine/core'
import { IconMapPin } from '@tabler/icons-react'
import { useState } from 'react'

type TripMapDropdownProps = {
  city: string
}

export default function TripMapDropdown({ city }: TripMapDropdownProps) {
  const [opened, setOpened] = useState(false)
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(city)}&output=embed`

  return (
    <Popover opened={opened} onChange={setOpened} width={420} position="bottom-start" withArrow shadow="md">
      <Popover.Target>
        <ActionIcon variant="light" aria-label={`Show map for ${city}`} onClick={() => setOpened(o => !o)}>
          <IconMapPin size={16} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown>
        <div style={{ width: 380, height: 280 }}>
          <iframe
            title={`Map of ${city}`}
            src={mapUrl}
            style={{ border: 0, width: '100%', height: '100%' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </Popover.Dropdown>
    </Popover>
  )
}



