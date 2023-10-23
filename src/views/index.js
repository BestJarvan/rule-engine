import { Outlet, useSearchParams } from "react-router-dom";
import { setToken } from "../utils/auth";

export default function Index() {
  const [searchParams] = useSearchParams()

  const token = searchParams.get('token')
  if (token) {
    setToken(token)
  }

  return (
    <>
      <Outlet />
    </>
  )
}