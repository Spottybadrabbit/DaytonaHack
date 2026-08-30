import { Link } from 'react-router-dom'
import { Button, EmptyState } from '@/components/ui'

export function NotFound() {
  return (
    <div className="container-wild py-28">
      <EmptyState
        title="Curiouser and curiouser"
        body="Nothing lives at this address. Try clearing the trail and looking again."
        action={
          <Link to="/">
            <Button className="mt-2">Back to safety</Button>
          </Link>
        }
      />
    </div>
  )
}
